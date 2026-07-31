/**
 * 用户业务服务。
 * 负责密码哈希、用户持久化、唯一性冲突映射和软删除查询。
 */
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";

/** 对外返回的用户形状，不包含密码字段。 */
export type UserResponse = Omit<User, "password">;

/** 执行用户 CRUD 和认证查询的服务。 */
@Injectable()
export class UsersService {
  /** 注入用户实体 Repository。 */
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /** 哈希密码后创建用户，并返回脱敏用户信息。 */
  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    const password = await bcrypt.hash(createUserDto.password, 12);
    const user = this.usersRepository.create({
      ...createUserDto,
      password,
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      return this.findOne(savedUser.id);
    } catch {
      throw new ConflictException("用户名或邮箱已存在");
    }
  }

  /** 按创建时间倒序返回全部未删除用户。 */
  async findAll(): Promise<UserResponse[]> {
    return await this.usersRepository.find({
      where: { isDeleted: false },
      order: { createdAt: "DESC" },
    });
  }

  /** 按 UUID 查询未删除用户，不存在时抛出 404。 */
  async findOne(id: string): Promise<UserResponse> {
    const user = await this.usersRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException("用户不存在或已删除");
    }

    return user;
  }

  /** 更新用户资料，并将唯一约束冲突转换为 409。 */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);

    try {
      const savedUser = await this.usersRepository.save(user);
      return this.findOne(savedUser.id);
    } catch {
      throw new ConflictException("用户名或邮箱已存在");
    }
  }

  /** 标记用户为已删除，不物理删除数据库记录。 */
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.isDeleted = true;
    user.deletedAt = new Date();
    await this.usersRepository.save(user);
  }

  /** 按用户名查询未删除用户，并显式加载默认隐藏的密码哈希。 */
  findByUsernameWithPassword(username: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.isDeleted = :isDeleted", { isDeleted: false })
      .andWhere("user.username = :username", { username })
      .getOne();
  }
}
