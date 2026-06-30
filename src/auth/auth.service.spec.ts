import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService, INVALID_CREDENTIALS_MESSAGE } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByUsernameWithPassword'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

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

  const expectAccessTokenSigned = () => {
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: user.id,
      username: user.username,
      email: user.email,
      type: 'access',
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    usersService = {
      findByUsernameWithPassword: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs in with username and returns an access token', async () => {
    const userWithPassword: User = {
      ...user,
      password: 'hashed-password',
    };
    usersService.findByUsernameWithPassword.mockResolvedValue(userWithPassword);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.sign.mockReturnValue('access-token');

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
    expectAccessTokenSigned();
    expect(result).toEqual({
      accessToken: 'access-token',
    });
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
