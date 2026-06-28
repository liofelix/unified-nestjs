import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService, INVALID_CREDENTIALS_MESSAGE } from './auth.service';
import { JwtTokenType } from './auth.types';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByUsernameWithPassword'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  const user = {
    id: 'e0716b8b-d8d7-47fd-a0d3-78d00480b12f',
    username: 'alice',
    email: 'alice@example.com',
    createdBy: null,
    updatedBy: null,
    isDeleted: false,
    deletedBy: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const expectTokensSigned = () => {
    expect(jwtService.sign).toHaveBeenNthCalledWith(1, {
      sub: user.id,
      username: user.username,
      email: user.email,
      type: JwtTokenType.ACCESS,
    });
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      2,
      {
        sub: user.id,
        username: user.username,
        email: user.email,
        type: JwtTokenType.REFRESH,
      },
      { expiresIn: '7d' },
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    usersService = {
      findByUsernameWithPassword: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(),
    };
    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs in with username and returns access and refresh tokens', async () => {
    const userWithPassword: User = {
      ...user,
      password: 'hashed-password',
    };
    usersService.findByUsernameWithPassword.mockResolvedValue(userWithPassword);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    configService.get.mockReturnValue('7d');
    jwtService.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    const result = await service.login({
      username: 'alice',
      password: 'plain-password',
    });

    expect(usersService.findByUsernameWithPassword).toHaveBeenCalledWith(
      'alice',
    );
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'plain-password',
      'hashed-password',
    );
    expectTokensSigned();
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user,
    });
    expect(result.user).not.toHaveProperty('password');
  });

  it('throws unauthorized when the user does not exist', async () => {
    usersService.findByUsernameWithPassword.mockResolvedValue(null);

    await expect(
      service.login({
        username: 'missing',
        password: 'plain-password',
      }),
    ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
  });

  it('throws unauthorized when the password is invalid', async () => {
    const userWithPassword: User = {
      ...user,
      password: 'hashed-password',
    };
    usersService.findByUsernameWithPassword.mockResolvedValue(userWithPassword);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({
        username: 'alice',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
  });

  it('returns null for stateless logout', () => {
    expect(service.logout()).toBeNull();
  });
});
