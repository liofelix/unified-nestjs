import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<
    Pick<
      Repository<User>,
      'create' | 'createQueryBuilder' | 'find' | 'findOne' | 'save'
    >
  >;
  let queryBuilder: {
    addSelect: jest.Mock;
    andWhere: jest.Mock;
    getOne: jest.Mock;
    where: jest.Mock;
  };

  const userId = 'e0716b8b-d8d7-47fd-a0d3-78d00480b12f';

  beforeEach(async () => {
    jest.clearAllMocks();
    repository = {
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      where: jest.fn().mockReturnThis(),
    };
    repository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hashes the password and omits it from the created user response', async () => {
    const user = {
      id: userId,
      username: 'alice',
      email: 'alice@example.com',
      password: 'hashed-password',
      createdBy: null,
      updatedBy: null,
      isDeleted: false,
      deletedBy: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;
    const { password: _password, ...responseUser } = user;
    void _password;
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    repository.create.mockReturnValue(user);
    repository.save.mockResolvedValue(user);
    repository.findOne.mockResolvedValue(responseUser as User);

    const result = await service.create({
      username: 'alice',
      email: 'alice@example.com',
      password: 'plain-password',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 12);
    expect(result).not.toHaveProperty('password');
    expect(result).toMatchObject({ id: userId, createdBy: null });
  });

  it('soft deletes a user and records the deletion timestamp', async () => {
    const user = {
      id: userId,
      isDeleted: false,
      deletedBy: null,
      deletedAt: null,
    } as User;
    repository.findOne.mockResolvedValue(user);
    repository.save.mockResolvedValue(user);

    await service.remove(userId);

    expect(user).toMatchObject({
      isDeleted: true,
      deletedBy: null,
    });
    expect(user.deletedAt).toBeInstanceOf(Date);
  });

  it('finds an active user by username and includes the password', async () => {
    const user = {
      id: userId,
      username: 'alice',
      email: 'alice@example.com',
      password: 'hashed-password',
      isDeleted: false,
    } as User;
    queryBuilder.getOne.mockResolvedValue(user);

    const result = await service.findByUsernameWithPassword('alice');

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('user.password');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'user.isDeleted = :isDeleted',
      { isDeleted: false },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.username = :username',
      { username: 'alice' },
    );
    expect(result).toBe(user);
  });
});
