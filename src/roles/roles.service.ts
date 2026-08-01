/**
 * 角色业务服务。
 * 负责角色 CRUD、系统角色保护、软删除和用户可分配角色的校验。
 */
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { PaginationDto } from "../common/dto/pagination.dto";
import { PaginationResult } from "../common/types/pagination-result";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { Role } from "./entities/role.entity";
import { SYSTEM_ROLE_CODES } from "./roles.constants";

/** 重复角色编码时的对外错误消息。 */
const ROLE_ALREADY_EXISTS_MESSAGE = "角色编码已存在";

/** 查询不到有效角色时的对外错误消息。 */
const ROLE_NOT_FOUND_MESSAGE = "角色不存在或已删除";

/** 尝试修改系统角色编码时的对外错误消息。 */
const SYSTEM_ROLE_CODE_IMMUTABLE_MESSAGE = "系统角色编码不可修改";

/** 尝试删除系统角色时的对外错误消息。 */
const SYSTEM_ROLE_DELETE_FORBIDDEN_MESSAGE = "系统角色不可删除";

/** 尝试删除仍关联用户的角色时的对外错误消息。 */
const ROLE_ASSIGNED_TO_USERS_MESSAGE = "角色仍关联用户，无法删除";

/** 默认 user 角色缺失时的内部错误消息。 */
const DEFAULT_USER_ROLE_MISSING_MESSAGE = "默认用户角色不存在";

/** 对外返回的角色形状，不反向包含用户集合。 */
export type RoleResponse = Omit<Role, "users">;

/** 执行角色 CRUD、软删除和角色分配校验。 */
@Injectable()
export class RolesService {
  /** 注入角色实体 Repository。 */
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  /** 创建普通角色并写入创建人。 */
  async create(dto: CreateRoleDto, actorId: string): Promise<RoleResponse> {
    try {
      return await this.rolesRepository.save(
        this.rolesRepository.create({ ...dto, createdBy: actorId }),
      );
    } catch {
      throw new ConflictException(ROLE_ALREADY_EXISTS_MESSAGE);
    }
  }

  /** 按创建时间倒序分页返回未删除角色。 */
  async findAll(query: PaginationDto): Promise<PaginationResult<RoleResponse>> {
    const [items, total] = await this.rolesRepository.findAndCount({
      where: { isDeleted: false },
      order: { createdAt: "DESC" },
      skip: (query.pageNo - 1) * query.pageSize,
      take: query.pageSize,
    });

    return { items, total, pageNo: query.pageNo, pageSize: query.pageSize };
  }

  /** 按 UUID 查询未删除角色，不存在时抛出 404。 */
  async findOne(id: string): Promise<RoleResponse> {
    const role = await this.rolesRepository.findOne({ where: { id, isDeleted: false } });

    if (!role) {
      throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE);
    }

    return role;
  }

  /** 更新角色资料；系统角色仅禁止变更 code。 */
  async update(id: string, dto: UpdateRoleDto, actorId: string): Promise<RoleResponse> {
    const role = await this.findOne(id);

    if (role.isSystem && dto.code !== undefined && dto.code !== role.code) {
      throw new ConflictException(SYSTEM_ROLE_CODE_IMMUTABLE_MESSAGE);
    }

    Object.assign(role, dto, { updatedBy: actorId });

    try {
      return await this.rolesRepository.save(role);
    } catch {
      throw new ConflictException(ROLE_ALREADY_EXISTS_MESSAGE);
    }
  }

  /** 软删除未被用户关联的普通角色，并记录删除审计字段。 */
  async remove(id: string, actorId: string): Promise<void> {
    const role = await this.findOne(id);

    if (
      role.isSystem ||
      role.code === SYSTEM_ROLE_CODES.admin ||
      role.code === SYSTEM_ROLE_CODES.user
    ) {
      throw new ConflictException(SYSTEM_ROLE_DELETE_FORBIDDEN_MESSAGE);
    }

    const assignedUserCount = await this.rolesRepository
      .createQueryBuilder("role")
      .innerJoin("role.users", "user")
      .where("role.id = :id", { id })
      .getCount();

    if (assignedUserCount > 0) {
      throw new ConflictException(ROLE_ASSIGNED_TO_USERS_MESSAGE);
    }

    role.isDeleted = true;
    role.deletedAt = new Date();
    role.deletedBy = actorId;
    await this.rolesRepository.save(role);
  }

  /** 校验并返回全部未删除的指定角色；任何无效 ID 都会拒绝整个请求。 */
  async findActiveByIds(roleIds: string[], manager?: EntityManager): Promise<Role[]> {
    if (roleIds.length === 0) {
      return [];
    }

    const repository = manager?.getRepository(Role) ?? this.rolesRepository;
    const roles = await repository.find({ where: { id: In(roleIds), isDeleted: false } });

    if (roles.length !== roleIds.length) {
      throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE);
    }

    return roles;
  }

  /** 返回新用户应关联的默认 user 角色与请求指定角色。 */
  async resolveRolesForNewUser(roleIds: string[], manager?: EntityManager): Promise<Role[]> {
    const repository = manager?.getRepository(Role) ?? this.rolesRepository;
    const roles = await this.findActiveByIds(roleIds, manager);
    const defaultUserRole = await repository.findOne({
      where: { code: SYSTEM_ROLE_CODES.user, isDeleted: false },
    });

    if (!defaultUserRole) {
      throw new InternalServerErrorException(DEFAULT_USER_ROLE_MISSING_MESSAGE);
    }

    return roles.some((role) => role.id === defaultUserRole.id)
      ? roles
      : [defaultUserRole, ...roles];
  }
}
