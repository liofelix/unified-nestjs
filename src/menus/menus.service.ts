/**
 * 菜单业务服务。
 * 负责菜单 CRUD、树形组装、角色菜单替换和当前用户菜单权限查询。
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, QueryFailedError, Repository } from "typeorm";
import { JwtAuthenticatedUser } from "../auth/auth.types";
import { Role } from "../roles/entities/role.entity";
import { SYSTEM_ROLE_CODES } from "../roles/roles.constants";
import { User } from "../users/entities/user.entity";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import {
  MENU_TYPE_BUTTON,
  MENU_TYPE_DIRECTORY,
  MENU_TYPE_PAGE,
  MENU_TYPES,
  type MenuType,
} from "./menus.constants";
import { Menu } from "./entities/menu.entity";

/** 菜单编码已被占用时的对外错误消息。 */
const MENU_CODE_ALREADY_EXISTS_MESSAGE = "菜单编码已存在";

/** 按钮权限编码已被占用时的对外错误消息。 */
const MENU_PERMISSION_ALREADY_EXISTS_MESSAGE = "按钮权限编码已存在";

/** 查询不到有效菜单时的对外错误消息。 */
const MENU_NOT_FOUND_MESSAGE = "菜单不存在或已删除";

/** 菜单父级类型不符合层级规则时的对外错误消息。 */
const MENU_PARENT_TYPE_INVALID_MESSAGE = "菜单父级类型不合法";

/** 菜单层级形成循环时的对外错误消息。 */
const MENU_PARENT_CYCLE_MESSAGE = "菜单层级不能形成循环";

/** 菜单目录或页面缺少路由路径时的对外错误消息。 */
const MENU_PATH_REQUIRED_MESSAGE = "目录和页面菜单必须填写路由路径";

/** 目录或页面误填按钮权限时的对外错误消息。 */
const MENU_PERMISSION_FORBIDDEN_MESSAGE = "目录和页面菜单不允许填写按钮权限";

/** 页面菜单缺少组件标识时的对外错误消息。 */
const MENU_COMPONENT_REQUIRED_MESSAGE = "页面菜单必须填写组件标识";

/** 按钮菜单缺少权限编码时的对外错误消息。 */
const MENU_PERMISSION_REQUIRED_MESSAGE = "按钮菜单必须填写权限编码";

/** 菜单存在活动子节点时的对外错误消息。 */
const MENU_HAS_CHILDREN_MESSAGE = "菜单存在子节点，无法删除";

/** 菜单仍关联角色时的对外错误消息。 */
const MENU_ASSIGNED_TO_ROLES_MESSAGE = "菜单仍关联角色，无法删除";

/** 查询不到有效角色时的对外错误消息。 */
const ROLE_NOT_FOUND_MESSAGE = "角色不存在或已删除";

/** 查询不到当前用户时的对外错误消息。 */
const USER_NOT_FOUND_MESSAGE = "用户不存在或已删除";

/** 不包含角色、父子关系的菜单响应形状。 */
export type MenuResponse = Omit<Menu, "parent" | "children" | "roles">;

/** 带子节点的菜单树响应形状。 */
export type MenuTreeNode = MenuResponse & { children: MenuTreeNode[] };

/** 当前用户可访问的菜单和按钮权限。 */
export interface CurrentMenuResponse {
  /** 当前用户可访问的目录和页面菜单树。 */
  menus: MenuTreeNode[];
  /** 当前用户可用的按钮权限编码。 */
  permissions: string[];
}

/** 角色菜单关联响应。 */
export interface RoleMenusResponse {
  /** 角色直接关联的菜单 UUID。 */
  menuIds: string[];
}

/** 菜单写入前的完整规范化数据。 */
interface MenuDraft {
  code: string;
  name: string;
  type: MenuType;
  parentId: string | null;
  path: string | null;
  component: string | null;
  icon: string | null;
  permission: string | null;
  sort: number;
  isVisible: boolean;
}

/** 执行菜单读写、树形组装和角色权限查询的服务。 */
@Injectable()
export class MenusService {
  /** 注入菜单、角色和用户 Repository。 */
  constructor(
    @InjectRepository(Menu)
    private readonly menusRepository: Repository<Menu>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /** 创建菜单并写入创建人。 */
  async create(dto: CreateMenuDto, actorId: string): Promise<MenuResponse> {
    await this.assertAdmin(actorId);

    const draft = await this.prepareDraft(dto);
    const menu = this.menusRepository.create({ ...draft, createdBy: actorId });

    try {
      return this.toResponse(await this.menusRepository.save(menu));
    } catch (error) {
      this.throwSaveConflict(error);
    }
  }

  /** 返回全部未删除菜单组成的完整树。 */
  async findAll(actorId: string): Promise<MenuTreeNode[]> {
    await this.assertAdmin(actorId);

    return this.buildTree(await this.findActiveMenus());
  }

  /** 查询单个未删除菜单。 */
  async findOne(id: string, actorId: string): Promise<MenuResponse> {
    await this.assertAdmin(actorId);

    return this.toResponse(await this.findActiveMenu(id));
  }

  /** 更新菜单资料并写入更新人。 */
  async update(id: string, dto: UpdateMenuDto, actorId: string): Promise<MenuResponse> {
    await this.assertAdmin(actorId);

    const menu = await this.findActiveMenu(id);
    const draft = await this.prepareDraft(dto, menu);

    Object.assign(menu, draft, { updatedBy: actorId });

    try {
      return this.toResponse(await this.menusRepository.save(menu));
    } catch (error) {
      this.throwSaveConflict(error);
    }
  }

  /** 软删除没有活动子节点和角色关联的菜单。 */
  async remove(id: string, actorId: string): Promise<void> {
    await this.assertAdmin(actorId);

    const menu = await this.findActiveMenu(id);
    const childCount = await this.menusRepository
      .createQueryBuilder("child")
      .innerJoin("child.parent", "parent")
      .where("parent.id = :parentId", { parentId: id })
      .andWhere("child.isDeleted = :isDeleted", { isDeleted: false })
      .getCount();

    if (childCount > 0) {
      throw new ConflictException(MENU_HAS_CHILDREN_MESSAGE);
    }

    const assignedRoleCount = await this.menusRepository
      .createQueryBuilder("menu")
      .innerJoin("menu.roles", "role")
      .where("menu.id = :menuId", { menuId: id })
      .getCount();

    if (assignedRoleCount > 0) {
      throw new ConflictException(MENU_ASSIGNED_TO_ROLES_MESSAGE);
    }

    menu.isDeleted = true;
    menu.deletedAt = new Date();
    menu.deletedBy = actorId;
    await this.menusRepository.save(menu);
  }

  /** 查询角色直接关联的有效菜单 ID。 */
  async findRoleMenuIds(roleId: string, actorId: string): Promise<RoleMenusResponse> {
    await this.assertAdmin(actorId);

    const role = await this.findRoleWithMenus(roleId);

    return {
      menuIds: (role.menus ?? []).map((menu) => menu.id),
    };
  }

  /** 在事务中原子替换角色菜单关联。 */
  async replaceRoleMenus(
    roleId: string,
    menuIds: string[],
    actorId: string,
    manager?: EntityManager,
  ): Promise<RoleMenusResponse> {
    const replace = async (transactionManager: EntityManager): Promise<RoleMenusResponse> => {
      await this.assertAdmin(actorId, transactionManager);

      const uniqueMenuIds = [...new Set(menuIds)];
      const rolesRepository = transactionManager.getRepository(Role);
      const menus = await this.findActiveMenusByIds(uniqueMenuIds, transactionManager);
      const role = await this.findRoleWithMenus(roleId, transactionManager);

      role.menus = menus;
      await rolesRepository.save(role);

      return { menuIds: menus.map((menu) => menu.id) };
    };

    return manager ? replace(manager) : this.rolesRepository.manager.transaction(replace);
  }

  /** 验证调用者是未删除用户关联的活动 admin 角色。 */
  async assertAdmin(actorId: string, manager?: EntityManager): Promise<void> {
    const repository = manager?.getRepository(User) ?? this.usersRepository;
    const adminUser = await repository
      .createQueryBuilder("user")
      .innerJoin(
        "user.roles",
        "role",
        "role.isDeleted = :roleDeleted AND role.code = :adminRoleCode",
        { roleDeleted: false, adminRoleCode: SYSTEM_ROLE_CODES.admin },
      )
      .where("user.id = :userId", { userId: actorId })
      .andWhere("user.isDeleted = :userDeleted", { userDeleted: false })
      .getOne();

    if (!adminUser) {
      throw new ForbiddenException();
    }
  }

  /** 返回当前用户的菜单树和按钮权限编码。 */
  async findCurrentUserMenus(user: JwtAuthenticatedUser): Promise<CurrentMenuResponse> {
    const currentUser = await this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "role", "role.isDeleted = :roleDeleted", {
        roleDeleted: false,
      })
      .leftJoinAndSelect("role.menus", "menu", "menu.isDeleted = :menuDeleted", {
        menuDeleted: false,
      })
      .where("user.id = :userId", { userId: user.id })
      .andWhere("user.isDeleted = :userDeleted", { userDeleted: false })
      .getOne();

    if (!currentUser) {
      throw new NotFoundException(USER_NOT_FOUND_MESSAGE);
    }

    const activeMenus = await this.findActiveMenus();
    const activeMenuById = new Map(activeMenus.map((menu) => [menu.id, menu]));
    const hasAdminRole = (currentUser.roles ?? []).some(
      (role) => role.code === SYSTEM_ROLE_CODES.admin,
    );
    const accessibleMenuIds = new Set<string>();

    if (hasAdminRole) {
      for (const menu of activeMenus) {
        accessibleMenuIds.add(menu.id);
      }
    } else {
      for (const role of currentUser.roles ?? []) {
        for (const menu of role.menus ?? []) {
          accessibleMenuIds.add(menu.id);
        }
      }
    }

    this.addMenuAncestors(accessibleMenuIds, activeMenuById);

    const accessibleMenus = activeMenus.filter((menu) => accessibleMenuIds.has(menu.id));
    const menuTree = accessibleMenus.filter((menu) => menu.type !== MENU_TYPE_BUTTON);
    const permissions = accessibleMenus
      .filter((menu) => menu.type === MENU_TYPE_BUTTON && menu.permission)
      .map((menu) => menu.permission as string);

    return {
      menus: this.buildTree(menuTree),
      permissions: [...new Set(permissions)],
    };
  }

  /** 将创建或更新参数合并为完整菜单草稿并校验业务规则。 */
  private async prepareDraft(dto: CreateMenuDto | UpdateMenuDto, current?: Menu) {
    const draft = this.normalizeDraft(dto, current);

    await this.validateDraft(draft, current?.id);
    return draft;
  }

  /** 将 DTO 字段转换为统一的数据库写入形状。 */
  private normalizeDraft(dto: CreateMenuDto | UpdateMenuDto, current?: Menu): MenuDraft {
    const code = dto.code ?? current?.code;
    const name = dto.name ?? current?.name;
    const type = dto.type ?? current?.type;
    const parentId = dto.parentId === undefined ? (current?.parentId ?? null) : dto.parentId;
    const path = dto.path === undefined ? (current?.path ?? null) : dto.path;
    const component = dto.component === undefined ? (current?.component ?? null) : dto.component;
    const icon = dto.icon === undefined ? (current?.icon ?? null) : dto.icon;
    const permission =
      dto.permission === undefined ? (current?.permission ?? null) : dto.permission;
    const sort = dto.sort === undefined ? (current?.sort ?? 0) : dto.sort;
    const isVisible = dto.isVisible === undefined ? (current?.isVisible ?? true) : dto.isVisible;

    if (typeof code !== "string" || typeof name !== "string") {
      throw new BadRequestException("菜单编码和名称不能为空");
    }

    if (!this.isMenuType(type)) {
      throw new BadRequestException("菜单类型不合法");
    }

    if (typeof sort !== "number" || !Number.isInteger(sort) || sort < 0) {
      throw new BadRequestException("菜单排序值必须是非负整数");
    }

    if (typeof isVisible !== "boolean") {
      throw new BadRequestException("菜单可见状态必须是布尔值");
    }

    return {
      code: code.trim(),
      name: name.trim(),
      type,
      parentId: parentId ?? null,
      path: this.normalizeOptionalString(path),
      component: this.normalizeOptionalString(component),
      icon: this.normalizeOptionalString(icon),
      permission: this.normalizeOptionalString(permission),
      sort,
      isVisible,
    };
  }

  /** 校验菜单类型、父级层级、循环引用和唯一字段。 */
  private async validateDraft(draft: MenuDraft, currentId?: string): Promise<void> {
    if (!draft.code || !draft.name) {
      throw new BadRequestException("菜单编码和名称不能为空");
    }

    if (draft.type === MENU_TYPE_BUTTON) {
      if (!draft.permission) {
        throw new BadRequestException(MENU_PERMISSION_REQUIRED_MESSAGE);
      }

      draft.path = null;
      draft.component = null;
    } else {
      if (draft.permission) {
        throw new BadRequestException(MENU_PERMISSION_FORBIDDEN_MESSAGE);
      }

      if (!draft.path) {
        throw new BadRequestException(MENU_PATH_REQUIRED_MESSAGE);
      }

      if (draft.type === MENU_TYPE_PAGE && !draft.component) {
        throw new BadRequestException(MENU_COMPONENT_REQUIRED_MESSAGE);
      }

      draft.permission = null;
      if (draft.type === MENU_TYPE_DIRECTORY) {
        draft.component = null;
      }
    }

    if (draft.parentId) {
      if (draft.parentId === currentId) {
        throw new ConflictException(MENU_PARENT_CYCLE_MESSAGE);
      }

      const parent = await this.findActiveMenu(draft.parentId);
      const isValidParent =
        draft.type === MENU_TYPE_BUTTON
          ? parent.type === MENU_TYPE_PAGE
          : parent.type === MENU_TYPE_DIRECTORY;

      if (!isValidParent) {
        throw new BadRequestException(MENU_PARENT_TYPE_INVALID_MESSAGE);
      }

      await this.assertNoParentCycle(currentId, draft.parentId);
    }

    const codeExists = await this.menusRepository.findOne({ where: { code: draft.code } });
    if (codeExists && codeExists.id !== currentId) {
      throw new ConflictException(MENU_CODE_ALREADY_EXISTS_MESSAGE);
    }

    if (draft.permission) {
      const permissionExists = await this.menusRepository.findOne({
        where: { permission: draft.permission },
      });

      if (permissionExists && permissionExists.id !== currentId) {
        throw new ConflictException(MENU_PERMISSION_ALREADY_EXISTS_MESSAGE);
      }
    }
  }

  /** 沿父链向上检查菜单不能形成循环。 */
  private async assertNoParentCycle(menuId: string | undefined, parentId: string): Promise<void> {
    if (!menuId) {
      return;
    }

    const visitedIds = new Set<string>();
    let currentParentId: string | null = parentId;

    while (currentParentId) {
      if (currentParentId === menuId || visitedIds.has(currentParentId)) {
        throw new ConflictException(MENU_PARENT_CYCLE_MESSAGE);
      }

      visitedIds.add(currentParentId);
      const parent = await this.findActiveMenu(currentParentId);
      currentParentId = parent.parentId;
    }
  }

  /** 查询全部未删除菜单并按同级排序。 */
  private findActiveMenus(manager?: EntityManager): Promise<Menu[]> {
    const repository = manager?.getRepository(Menu) ?? this.menusRepository;

    return repository.find({
      where: { isDeleted: false },
      order: { sort: "ASC", createdAt: "ASC" },
    });
  }

  /** 查询单个未删除菜单实体。 */
  private async findActiveMenu(id: string): Promise<Menu> {
    const menu = await this.menusRepository.findOne({ where: { id, isDeleted: false } });

    if (!menu) {
      throw new NotFoundException(MENU_NOT_FOUND_MESSAGE);
    }

    return menu;
  }

  /** 查询角色及其未删除菜单关系。 */
  private async findRoleWithMenus(roleId: string, manager?: EntityManager): Promise<Role> {
    const repository = manager?.getRepository(Role) ?? this.rolesRepository;
    const role = await repository
      .createQueryBuilder("role")
      .leftJoinAndSelect("role.menus", "menu", "menu.isDeleted = :menuDeleted", {
        menuDeleted: false,
      })
      .where("role.id = :roleId", { roleId })
      .andWhere("role.isDeleted = :roleDeleted", { roleDeleted: false })
      .getOne();

    if (!role) {
      throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE);
    }

    return role;
  }

  /** 校验并返回全部未删除的指定菜单。 */
  private async findActiveMenusByIds(ids: string[], manager?: EntityManager): Promise<Menu[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = manager?.getRepository(Menu) ?? this.menusRepository;
    const menus = await repository.find({ where: { id: In(ids), isDeleted: false } });

    if (menus.length !== ids.length) {
      throw new NotFoundException(MENU_NOT_FOUND_MESSAGE);
    }

    const menuById = new Map(menus.map((menu) => [menu.id, menu]));
    return ids.map((id) => menuById.get(id) as Menu);
  }

  /** 将指定菜单的所有有效父级加入访问集合。 */
  private addMenuAncestors(menuIds: Set<string>, menuById: Map<string, Menu>): void {
    const directMenuIds = [...menuIds];

    for (const menuId of directMenuIds) {
      let parentId = menuById.get(menuId)?.parentId ?? null;
      const visitedIds = new Set<string>();

      while (parentId && !visitedIds.has(parentId)) {
        visitedIds.add(parentId);
        const parent = menuById.get(parentId);

        if (!parent) {
          break;
        }

        menuIds.add(parent.id);
        parentId = parent.parentId;
      }
    }
  }

  /** 将平面菜单实体组装为按排序排列的树。 */
  private buildTree(menus: Menu[]): MenuTreeNode[] {
    const nodes = new Map<string, MenuTreeNode>();
    const roots: MenuTreeNode[] = [];

    for (const menu of menus) {
      nodes.set(menu.id, { ...this.toResponse(menu), children: [] });
    }

    for (const menu of menus) {
      const node = nodes.get(menu.id) as MenuTreeNode;
      const parent = menu.parentId ? nodes.get(menu.parentId) : undefined;

      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /** 将菜单实体转换为不带关系对象的响应。 */
  private toResponse(menu: Menu): MenuResponse {
    return {
      id: menu.id,
      code: menu.code,
      name: menu.name,
      type: menu.type,
      parentId: menu.parentId ?? null,
      path: menu.path,
      component: menu.component,
      icon: menu.icon,
      permission: menu.permission,
      sort: menu.sort,
      isVisible: menu.isVisible,
      createdAt: menu.createdAt,
      createdBy: menu.createdBy,
      updatedAt: menu.updatedAt,
      updatedBy: menu.updatedBy,
      deletedAt: menu.deletedAt,
      deletedBy: menu.deletedBy,
      isDeleted: menu.isDeleted,
    };
  }

  /** 判断值是否为受支持的菜单类型。 */
  private isMenuType(value: unknown): value is MenuType {
    return typeof value === "string" && MENU_TYPES.includes(value as MenuType);
  }

  /** 将可选字符串统一转换为空值或去除首尾空白的字符串。 */
  private normalizeOptionalString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException("菜单文本字段必须是字符串");
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  /** 将数据库唯一约束错误映射为稳定的业务冲突消息。 */
  private throwSaveConflict(error: unknown): never {
    if (!(error instanceof QueryFailedError)) {
      throw error;
    }

    const driverError = error.driverError as { constraint?: string };
    if (driverError.constraint?.includes("permission")) {
      throw new ConflictException(MENU_PERMISSION_ALREADY_EXISTS_MESSAGE);
    }

    throw new ConflictException(MENU_CODE_ALREADY_EXISTS_MESSAGE);
  }
}
