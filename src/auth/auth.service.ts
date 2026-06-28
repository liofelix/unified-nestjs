import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, JwtTokenType } from './auth.types';
import { UserResponse, UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

export const INVALID_CREDENTIALS_MESSAGE = '用户名或密码错误';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByUsernameWithPassword(
      loginDto.username,
    );

    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.buildAuthResponse(this.omitPassword(user));
  }

  logout(): null {
    return null;
  }

  private buildAuthResponse(user: UserResponse): AuthResponse {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };
    const refreshTokenExpiresIn = (this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) ?? '7d') as JwtSignOptions['expiresIn'];

    return {
      accessToken: this.jwtService.sign({
        ...payload,
        type: JwtTokenType.ACCESS,
      }),
      refreshToken: this.jwtService.sign(
        {
          ...payload,
          type: JwtTokenType.REFRESH,
        },
        {
          expiresIn: refreshTokenExpiresIn,
        },
      ),
      user,
    };
  }

  private omitPassword(user: User): UserResponse {
    const { password: _password, ...userResponse } = user;
    void _password;

    return userResponse;
  }
}
