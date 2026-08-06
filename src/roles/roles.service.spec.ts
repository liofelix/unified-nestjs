/**
 * 角色服务单元测试。
 * 使用内存 Repository 覆盖角色 CRUD、系统角色保护、用户分配校验和菜单事务替换。
 */
import { ConflictException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { QueryFailedError } from "typeorm";
import { BinaryStatus } from "../common/types/binary-status";
import { Role } from "./entities/role.entity";
import { RolesService } from "./roles.service";

const ROLE_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

function createRole(overrides: Partial<Role> = {}) {
  return {
    id: ROLE_ID,
    code: "editor",
    name: "编辑",
    description: null,
    isSystem: BinaryStatus.NO,
    isDeleted: BinaryStatus.NO,
    deletedAt: null,
    deletedBy: null,
    menus: [],
    users: [],
    ...overrides,
  } as Role;
}

function createService() {
  const role = createRole();
  const managerRepository = {
    findOne: vi.fn().mockResolvedValue(role),
    save: vi.fn().mockResolvedValue(role),
  };
  const manager = { getRepository: vi.fn().mockReturnValue(managerRepository) };
  const repository = {
    create: vi.fn((value) => ({ ...role, ...value })),
    find: vi.fn().mockResolvedValue([role]),
    findAndCount: vi.fn().mockResolvedValue([[role], 1]),
    findOne: vi.fn().mockResolvedValue(role),
    save: vi.fn().mockResolvedValue(role),
    createQueryBuilder: vi.fn(),
    manager: {
      transaction: vi.fn(async (callback: (value: typeof manager) => unknown) => callback(manager)),
    },
  };
  const menusService = {
    assertAdmin: vi.fn().mockResolvedValue(undefined),
    replaceRoleMenus: vi.fn().mockResolvedValue({ menuIds: [] }),
  };
  const service = new RolesService(repository as never, menusService as never);

  return { service, role, repository, managerRepository, menusService };
}

function createCountBuilder(count: number) {
  return {
    getCount: vi.fn().mockResolvedValue(count),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
}

describe("RolesService", () => {
  it("创建角色并记录操作者", async () => {
    const { service, repository } = createService();

    await expect(
      service.create({ code: "editor", name: "编辑" }, "actor-1"),
    ).resolves.toMatchObject({
      code: "editor",
    });
    expect(repository.create).toHaveBeenCalledWith({
      code: "editor",
      name: "编辑",
      createdBy: "actor-1",
    });
  });

  it("角色编码冲突时返回 ConflictException", async () => {
    const { service, repository } = createService();
    repository.save.mockRejectedValueOnce(
      new QueryFailedError("INSERT", [], {
        code: "23505",
        constraint: "roles_code_key",
      }),
    );

    await expect(
      service.create({ code: "editor", name: "编辑" }, "actor-1"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("未知数据库异常不会被误报为角色编码冲突", async () => {
    const { service, repository } = createService();
    const error = new Error("database unavailable");
    repository.save.mockRejectedValueOnce(error);

    await expect(service.create({ code: "editor", name: "编辑" }, "actor-1")).rejects.toBe(error);
  });

  it("返回分页角色并过滤已删除数据", async () => {
    const { service, repository } = createService();

    await expect(service.findAll({ pageNo: 2, pageSize: 10 })).resolves.toEqual({
      items: [expect.any(Object)],
      total: 1,
      pageNo: 2,
      pageSize: 10,
    });
    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isDeleted: BinaryStatus.NO }, skip: 10, take: 10 }),
    );
  });

  it("找不到角色时返回 404", async () => {
    const { service, repository } = createService();
    repository.findOne.mockResolvedValueOnce(null);

    await expect(service.findOne(ROLE_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("更新角色并在携带 menuIds 时执行管理权限和事务替换", async () => {
    const { service, repository, managerRepository, menusService } = createService();
    const updated = createRole({ name: "内容编辑" });
    managerRepository.findOne.mockResolvedValueOnce(updated);
    repository.findOne.mockResolvedValueOnce(updated);

    await expect(
      service.update(ROLE_ID, { name: "内容编辑", menuIds: ["menu-1"] }, "actor-1"),
    ).resolves.toEqual(updated);
    expect(menusService.assertAdmin).toHaveBeenCalledWith("actor-1");
    expect(menusService.replaceRoleMenus).toHaveBeenCalledWith(
      ROLE_ID,
      ["menu-1"],
      "actor-1",
      expect.anything(),
    );
    expect(managerRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: "内容编辑", updatedBy: "actor-1" }),
    );
  });

  it("禁止修改系统角色编码", async () => {
    const { service, managerRepository } = createService();
    managerRepository.findOne.mockResolvedValueOnce(
      createRole({ isSystem: BinaryStatus.YES, code: "admin" }),
    );

    await expect(service.update(ROLE_ID, { code: "other" }, "actor-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("禁止删除系统角色或仍被用户关联的角色", async () => {
    const systemCase = createService();
    systemCase.repository.findOne.mockResolvedValueOnce(createRole({ code: "admin" }));
    await expect(systemCase.service.remove(ROLE_ID, "actor-1")).rejects.toBeInstanceOf(
      ConflictException,
    );

    const assignedCase = createService();
    assignedCase.repository.createQueryBuilder.mockReturnValue(createCountBuilder(1));
    await expect(assignedCase.service.remove(ROLE_ID, "actor-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("软删除未关联用户的普通角色", async () => {
    const { service, role, repository } = createService();
    repository.createQueryBuilder.mockReturnValue(createCountBuilder(0));

    await service.remove(ROLE_ID, "actor-1");

    expect(role.isDeleted).toBe(BinaryStatus.YES);
    expect(role.deletedBy).toBe("actor-1");
    expect(role.deletedAt).toBeInstanceOf(Date);
    expect(repository.save).toHaveBeenCalledWith(role);
  });

  it("拒绝不存在的角色 ID 并处理默认 user 角色缺失", async () => {
    const { service, repository } = createService();
    repository.find.mockResolvedValueOnce([]);
    await expect(service.findActiveByIds([ROLE_ID])).rejects.toBeInstanceOf(NotFoundException);

    repository.find.mockResolvedValueOnce([]);
    repository.findOne.mockResolvedValueOnce(null);
    await expect(service.resolveRolesForNewUser([])).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it("为新用户补齐默认 user 角色且不重复添加", async () => {
    const { service, repository } = createService();
    const defaultRole = createRole({ id: "default", code: "user" });
    const requestedRole = createRole({ id: "requested", code: "editor" });
    repository.find.mockResolvedValueOnce([requestedRole]);
    repository.findOne.mockResolvedValueOnce(defaultRole);

    await expect(service.resolveRolesForNewUser(["requested"])).resolves.toEqual([
      defaultRole,
      requestedRole,
    ]);

    repository.find.mockResolvedValueOnce([defaultRole]);
    repository.findOne.mockResolvedValueOnce(defaultRole);
    await expect(service.resolveRolesForNewUser(["default"])).resolves.toEqual([defaultRole]);
  });
});
