/**
 * Passport JWT 策略。
 * 从 Bearer 请求头提取令牌，校验签名、用途、过期时间和 Redis 撤销状态。
 */
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthRevocationService } from "../auth.revocation.service";
import type { JwtAuthenticatedUser, JwtPayload } from "../auth.types";
import { UsersService } from "../../users/users.service";

/** JWT 载荷字段非法时对外返回的统一错误消息。 */
const INVALID_ACCESS_TOKEN_MESSAGE = "无效的访问令牌";

/** 令牌已被撤销时对外返回的统一错误消息。 */
const ACCESS_TOKEN_REVOKED_MESSAGE = "访问令牌已失效";

/** 将合法 JWT 载荷转换为请求上下文中的认证用户。 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /** 使用配置中的密钥初始化 Bearer JWT 提取和校验策略。 */
  constructor(
    configService: ConfigService,
    private readonly authRevocationService: AuthRevocationService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  /** 校验令牌业务字段、撤销状态和当前用户状态，并返回请求上下文。 */
  async validate(payload: JwtPayload): Promise<JwtAuthenticatedUser> {
    if (
      !payload ||
      typeof payload !== "object" ||
      payload.type !== "access" ||
      typeof payload.sub !== "string" ||
      !payload.sub ||
      typeof payload.jti !== "string" ||
      !payload.jti ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= 0
    ) {
      throw new UnauthorizedException(INVALID_ACCESS_TOKEN_MESSAGE);
    }

    if (await this.authRevocationService.isRevoked(payload.jti)) {
      throw new UnauthorizedException(ACCESS_TOKEN_REVOKED_MESSAGE);
    }

    const user = await this.usersService.findActiveAuthContext(payload.sub);
    if (!user) {
      throw new UnauthorizedException(INVALID_ACCESS_TOKEN_MESSAGE);
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      tokenId: payload.jti,
      expiresAt: payload.exp,
      roleCodes: user.roleCodes,
    };
  }
}
