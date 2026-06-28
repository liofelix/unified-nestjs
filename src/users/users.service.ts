import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

export type UserResponse = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    const password = await bcrypt.hash(createUserDto.password, 12);
    const user = this.usersRepository.create({
      ...createUserDto,
      password,
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      return this.findOne(savedUser.id);
    } catch (error) {
      this.throwUniqueConstraintError(error);
    }
  }

  async findAll(): Promise<UserResponse[]> {
    const users = await this.usersRepository.find({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
    });

    return users;
  }

  findOne(id: string): Promise<UserResponse> {
    return this.findActiveUser(id);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    const user = await this.findActiveUser(id);
    Object.assign(user, updateUserDto);

    try {
      const savedUser = await this.usersRepository.save(user);
      return this.findOne(savedUser.id);
    } catch (error) {
      this.throwUniqueConstraintError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const user = await this.findActiveUser(id);
    user.isDeleted = true;
    user.deletedAt = new Date();
    await this.usersRepository.save(user);
  }

  findByUsernameWithPassword(username: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('user.username = :username', { username })
      .getOne();
  }

  private async findActiveUser(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('用户不存在或已删除');
    }

    return user;
  }

  private throwUniqueConstraintError(error: unknown): never {
    if (
      error instanceof QueryFailedError &&
      (error as { driverError?: { code?: string } }).driverError?.code ===
        '23505'
    ) {
      throw new ConflictException('用户名或邮箱已存在');
    }

    throw error;
  }
}
