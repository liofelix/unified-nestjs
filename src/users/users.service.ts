/**
 * 用户业务服务。
 * 负责密码哈希、用户持久化、唯一性冲突映射和软删除查询。
 */
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginationDto } from "../common/dto/pagination.dto";
import { PaginationResult } from "../common/types/pagination-result";
import { BinaryStatus } from "../common/types/binary-status";
import * as bcrypt from "bcrypt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { isPostgresUniqueViolation } from "../common/errors/database-error";
import type { ActiveAuthContext } from "../auth/auth.types";
import { RolesService } from "../roles/roles.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";

/** 用户名或邮箱已被占用时对外返回的统一错误消息。 */
const USER_ALREADY_EXISTS_MESSAGE = "用户名或邮箱已存在";

/** 查询不到未删除用户时对外返回的统一错误消息。 */
const USER_NOT_FOUND_MESSAGE = "用户不存在或已删除";

/** 密码哈希计算使用的 bcrypt 成本因子。 */
const BCRYPT_SALT_ROUNDS = 12;

/** 对外返回的用户形状，不包含密码字段。 */
export type UserResponse = Omit<User, "password">;

/** 执行用户 CRUD 和认证查询的服务。 */
@Injectable()
export class UsersService {
  /** 注入用户实体 Repository。 */
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly rolesService: RolesService,
  ) {}

  /** 哈希密码后创建用户，并返回脱敏用户信息。 */
  async create(createUserDto: CreateUserDto, actorId: string): Promise<UserResponse> {
    const { roleIds = [], ...userDto } = createUserDto;
    const password = await bcrypt.hash(createUserDto.password, BCRYPT_SALT_ROUNDS);

    try {
      const savedUserId = await this.usersRepository.manager.transaction(async (manager) => {
        const roles = await this.rolesService.resolveRolesForNewUser(roleIds, manager);
        const user = manager
          .getRepository(User)
          .create({ ...userDto, password, roles, createdBy: actorId });
        const savedUser = await manager.getRepository(User).save(user);
        return savedUser.id;
      });

      return this.findOne(savedUserId);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ConflictException(USER_ALREADY_EXISTS_MESSAGE);
      }

      throw error;
    }
  }

  /** 按创建时间倒序分页返回未删除用户。 */
  async findAll(query: PaginationDto): Promise<PaginationResult<UserResponse>> {
    const [items, total] = await this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "role", "role.isDeleted = :roleDeleted", {
        roleDeleted: BinaryStatus.NO,
      })
      .where("user.isDeleted = :userDeleted", { userDeleted: BinaryStatus.NO })
      .orderBy("user.createdAt", "DESC")
      .skip((query.pageNo - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return { items, total, pageNo: query.pageNo, pageSize: query.pageSize };
  }

  /** 按 UUID 查询未删除用户，不存在时抛出 404。 */
  async findOne(id: string): Promise<UserResponse> {
    const user = await this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "role", "role.isDeleted = :roleDeleted", {
        roleDeleted: BinaryStatus.NO,
      })
      .where("user.id = :id", { id })
      .andWhere("user.isDeleted = :userDeleted", { userDeleted: BinaryStatus.NO })
      .getOne();

    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND_MESSAGE);
    }

    return user;
  }

  /**
   * 在事务中更新用户资料；请求显式携带 roleIds 时原子替换角色集合。
   * roleIds 未传时保持现有角色，空数组表示解除全部角色。
   */
  async update(id: string, updateUserDto: UpdateUserDto, actorId: string): Promise<UserResponse> {
    const { roleIds, ...userDto } = updateUserDto;

    try {
      const savedUserId = await this.usersRepository.manager.transaction(async (manager) => {
        const usersRepository = manager.getRepository(User);
        const user = await usersRepository.findOne({
          where: { id, isDeleted: BinaryStatus.NO },
        });

        if (!user) {
          throw new NotFoundException(USER_NOT_FOUND_MESSAGE);
        }

        Object.assign(user, userDto, { updatedBy: actorId });

        if (roleIds !== undefined) {
          user.roles = await this.rolesService.findActiveByIds(roleIds, manager);
        }

        const savedUser = await usersRepository.save(user);
        return savedUser.id;
      });

      return this.findOne(savedUserId);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ConflictException(USER_ALREADY_EXISTS_MESSAGE);
      }

      throw error;
    }
  }

  /** 标记用户为已删除，不物理删除数据库记录，并记录操作者。 */
  async remove(id: string, actorId: string): Promise<void> {
    const result = await this.usersRepository.update(
      { id, isDeleted: BinaryStatus.NO },
      { isDeleted: BinaryStatus.YES, deletedAt: new Date(), deletedBy: actorId },
    );

    if (!result.affected) {
      throw new NotFoundException(USER_NOT_FOUND_MESSAGE);
    }
  }

  /** 查询未删除用户的最新身份资料和角色编码，用于每次 JWT 请求重新授权。 */
  async findActiveAuthContext(id: string): Promise<ActiveAuthContext | null> {
    const user = await this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "role", "role.isDeleted = :roleDeleted", {
        roleDeleted: BinaryStatus.NO,
      })
      .where("user.id = :id", { id })
      .andWhere("user.isDeleted = :userDeleted", { userDeleted: BinaryStatus.NO })
      .getOne();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roleCodes: [...new Set((user.roles ?? []).map((role) => role.code))],
    };
  }

  /** 按用户名查询未删除用户，并显式加载默认隐藏的密码哈希。 */
  findByUsernameWithPassword(username: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.isDeleted = :isDeleted", { isDeleted: BinaryStatus.NO })
      .andWhere("user.username = :username", { username })
      .getOne();
  }
}
