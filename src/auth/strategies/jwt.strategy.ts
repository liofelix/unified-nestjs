/**
 * Passport JWT 策略。
 * 从 Bearer 请求头提取令牌，校验签名、用途、过期时间和 Redis 撤销状态。
 */
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthRevocationService } from "../auth.revocation.service";
import { JwtAuthenticatedUser, JwtPayload } from "../auth.types";

/** 将合法 JWT 载荷转换为请求上下文中的认证用户。 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /** 使用配置中的密钥初始化 Bearer JWT 提取和校验策略。 */
  constructor(
    configService: ConfigService,
    private readonly authRevocationService: AuthRevocationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  /** 校验令牌业务字段及撤销状态，并返回最小用户上下文。 */
  async validate(payload: JwtPayload): Promise<JwtAuthenticatedUser> {
    if (payload.type !== "access" || !payload.jti || !payload.exp) {
      throw new UnauthorizedException("无效的访问令牌");
    }

    if (await this.authRevocationService.isRevoked(payload.jti)) {
      throw new UnauthorizedException("访问令牌已失效");
    }

    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      tokenId: payload.jti,
      expiresAt: payload.exp,
    };
  }
}
