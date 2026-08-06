/**
 * 认证业务服务。
 * 负责校验用户凭据、签发 JWT，并委托撤销服务处理注销。
 */
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { UsersService } from "../users/users.service";
import { AuthRevocationService } from "./auth.revocation.service";
import { LoginDto } from "./dto/login.dto";
import type { AuthResponse, JwtAuthenticatedUser } from "./auth.types";

/** 凭据校验失败时对外返回的统一错误消息。 */
export const INVALID_CREDENTIALS_MESSAGE = "用户名或密码错误";

/** 执行登录和注销业务的服务。 */
@Injectable()
export class AuthService {
  /** 注入用户查询、JWT 签发和令牌撤销依赖。 */
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly authRevocationService: AuthRevocationService,
  ) {}

  /** 校验用户名和密码，成功后签发带唯一 jti 的访问令牌。 */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByUsernameWithPassword(loginDto.username);

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return {
      accessToken: this.jwtService.sign(
        {
          sub: user.id,
          username: user.username,
          email: user.email,
          type: "access",
        },
        { jwtid: randomUUID() },
      ),
    };
  }

  /** 按当前认证用户的令牌 ID 撤销令牌。 */
  async logout(user: JwtAuthenticatedUser): Promise<void> {
    await this.authRevocationService.revoke(user.tokenId, user.expiresAt);
  }
}
