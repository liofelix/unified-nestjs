/**
 * 菜单服务单元测试。
 * 使用可编排的查询构造器替身覆盖管理员权限、菜单规则、树构建和删除保护。
 */
import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { BinaryStatus } from "../common/types/binary-status";
import type { JwtAuthenticatedUser } from "../auth/auth.types";
import { Role } from "../roles/entities/role.entity";
import { User } from "../users/entities/user.entity";
import { Menu } from "./entities/menu.entity";
import { MenuType } from "./menus.constants";
import { MenusService } from "./menus.service";

const ACTOR_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

function createMenu(overrides: Partial<Menu> = {}) {
  return {
    id: "menu-1",
    code: "system",
    name: "系统",
    type: MenuType.DIRECTORY,
    parentId: null,
    path: "/system",
    component: null,
    icon: null,
    permission: null,
    sort: 0,
    isVisible: BinaryStatus.YES,
    isDeleted: BinaryStatus.NO,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdBy: ACTOR_ID,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    parent: null,
    children: [],
    roles: [],
    ...overrides,
  } as Menu;
}

function createBuilder<T>(result: T) {
  return {
    andWhere: vi.fn().mockReturnThis(),
    getCount: vi.fn().mockResolvedValue(result),
    getOne: vi.fn().mockResolvedValue(result),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
}

function createService() {
  const menu = createMenu();
  const adminBuilder = createBuilder({ id: ACTOR_ID });
  const menusRepository = {
    create: vi.fn((value) => ({ ...menu, ...value })),
    find: vi.fn().mockResolvedValue([menu]),
    findOne: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockImplementation(async (value) => value),
    createQueryBuilder: vi.fn(),
  };
  const rolesRepository = {
    createQueryBuilder: vi.fn().mockReturnValue(createBuilder({ id: "role-1", menus: [] })),
    manager: { transaction: vi.fn() },
  };
  const usersRepository = {
    createQueryBuilder: vi.fn().mockReturnValue(adminBuilder),
  };
  const service = new MenusService(
    menusRepository as never,
    rolesRepository as never,
    usersRepository as never,
  );

  return { service, menu, menusRepository, rolesRepository, usersRepository, adminBuilder };
}

describe("MenusService", () => {
  it("非管理员不能访问菜单管理能力", async () => {
    const { service, adminBuilder } = createService();
    adminBuilder.getOne.mockResolvedValueOnce(null);

    await expect(service.assertAdmin(ACTOR_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("创建页面菜单并规范化可选字段", async () => {
    const { service, menu, menusRepository } = createService();
    const created = createMenu({
      code: "users",
      name: "用户",
      type: MenuType.PAGE,
      path: "/users",
      component: "users/index",
    });
    menusRepository.create.mockReturnValueOnce(created);
    menusRepository.save.mockResolvedValueOnce(created);

    await expect(
      service.create(
        {
          code: " users ",
          name: " 用户 ",
          type: MenuType.PAGE,
          path: " /users ",
          component: " users/index ",
          icon: " ",
        },
        ACTOR_ID,
      ),
    ).resolves.toMatchObject({
      code: "users",
      name: "用户",
      path: "/users",
      component: "users/index",
      icon: null,
    });
    expect(menu).toBeDefined();
    expect(menusRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: ACTOR_ID, isVisible: BinaryStatus.YES }),
    );
  });

  it("拒绝按钮菜单缺失权限或父级类型不合法", async () => {
    const missingPermission = createService();
    await expect(
      missingPermission.service.create(
        { code: "button", name: "按钮", type: MenuType.BUTTON, parentId: null },
        ACTOR_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const wrongParent = createService();
    wrongParent.menusRepository.find
      .mockReset()
      .mockResolvedValueOnce([createMenu({ id: "parent", type: MenuType.PAGE })])
      .mockResolvedValueOnce([]);
    await expect(
      wrongParent.service.create(
        {
          code: "child",
          name: "子菜单",
          type: MenuType.PAGE,
          parentId: "parent",
          path: "/child",
          component: "child/index",
        },
        ACTOR_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("将平面菜单按父子关系组装为树", async () => {
    const { service, menusRepository } = createService();
    const root = createMenu({ id: "root", code: "root", name: "根" });
    const child = createMenu({
      id: "child",
      code: "child",
      name: "子页面",
      type: MenuType.PAGE,
      parentId: "root",
      path: "/child",
      component: "child/index",
      sort: 1,
    });
    menusRepository.find.mockResolvedValueOnce([child, root]);

    await expect(service.findAll(ACTOR_ID)).resolves.toEqual([
      expect.objectContaining({
        id: "root",
        children: [expect.objectContaining({ id: "child" })],
      }),
    ]);
  });

  it("返回当前用户可访问菜单、自动补齐祖先并去重权限", async () => {
    const { service, usersRepository, menusRepository } = createService();
    const root = createMenu({ id: "root", code: "root" });
    const page = createMenu({
      id: "page",
      code: "page",
      type: MenuType.PAGE,
      parentId: "root",
      path: "/page",
      component: "page/index",
    });
    const button = createMenu({
      id: "button",
      code: "button",
      type: MenuType.BUTTON,
      parentId: "page",
      path: null,
      permission: "page:view",
    });
    const userBuilder = createBuilder({
      id: ACTOR_ID,
      roles: [{ code: "editor", menus: [button, button] }],
    });
    usersRepository.createQueryBuilder.mockReturnValueOnce(userBuilder);
    menusRepository.find.mockResolvedValueOnce([root, page, button]);

    await expect(
      service.findCurrentUserMenus({ id: ACTOR_ID } as JwtAuthenticatedUser),
    ).resolves.toEqual({
      menus: [
        expect.objectContaining({
          id: "root",
          children: [expect.objectContaining({ id: "page" })],
        }),
      ],
      permissions: ["page:view"],
    });
  });

  it("阻止删除有子节点或角色关联的菜单", async () => {
    const childCase = createService();
    childCase.menusRepository.findOne.mockResolvedValueOnce(childCase.menu);
    childCase.menusRepository.createQueryBuilder.mockReturnValueOnce(createBuilder(1));
    await expect(childCase.service.remove("menu-1", ACTOR_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );

    const roleCase = createService();
    roleCase.menusRepository.findOne.mockResolvedValueOnce(roleCase.menu);
    roleCase.menusRepository.createQueryBuilder
      .mockReturnValueOnce(createBuilder(0))
      .mockReturnValueOnce(createBuilder(1));
    await expect(roleCase.service.remove("menu-1", ACTOR_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("父级循环检查复用一次活动菜单查询", async () => {
    const { service, menusRepository, menu } = createService();
    menusRepository.findOne.mockResolvedValueOnce(menu);
    menusRepository.find
      .mockReset()
      .mockResolvedValueOnce([
        createMenu({ id: "parent", parentId: "ancestor" }),
        createMenu({ id: "ancestor", parentId: "menu-1" }),
      ]);

    await expect(
      service.update(
        "menu-1",
        { parentId: "parent", path: "/system", type: MenuType.DIRECTORY },
        ACTOR_ID,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(menusRepository.find).toHaveBeenCalledTimes(1);
    expect(menusRepository.findOne).toHaveBeenCalledTimes(1);
  });

  it("软删除没有子节点和角色关联的菜单", async () => {
    const { service, menu, menusRepository } = createService();
    menusRepository.findOne.mockResolvedValueOnce(menu);
    menusRepository.createQueryBuilder
      .mockReturnValueOnce(createBuilder(0))
      .mockReturnValueOnce(createBuilder(0));

    await service.remove("menu-1", ACTOR_ID);

    expect(menu).toMatchObject({ isDeleted: BinaryStatus.YES, deletedBy: ACTOR_ID });
    expect(menu.deletedAt).toBeInstanceOf(Date);
    expect(menusRepository.save).toHaveBeenCalledWith(menu);
  });

  it("替换角色菜单时去重并按请求顺序返回", async () => {
    const { service, rolesRepository } = createService();
    const menuA = createMenu({ id: "menu-a" });
    const menuB = createMenu({ id: "menu-b" });
    const role = { id: "role-1", menus: [] } as unknown as Role;
    const transactionManager = {
      getRepository: vi.fn((entity) => {
        if (entity === User)
          return { createQueryBuilder: vi.fn().mockReturnValue(createBuilder({ id: ACTOR_ID })) };
        if (entity === Menu) return { find: vi.fn().mockResolvedValue([menuB, menuA]) };
        return {
          createQueryBuilder: vi.fn().mockReturnValue(createBuilder(role)),
          save: vi.fn().mockResolvedValue(role),
        };
      }),
    };

    await expect(
      service.replaceRoleMenus(
        "role-1",
        ["menu-a", "menu-a", "menu-b"],
        ACTOR_ID,
        transactionManager as never,
      ),
    ).resolves.toEqual({ menuIds: ["menu-a", "menu-b"] });
    expect(role.menus).toEqual([menuA, menuB]);
    expect(rolesRepository.manager.transaction).not.toHaveBeenCalled();
  });
});
