import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthRevocationService } from "../auth.revocation.service";
import { JwtAuthenticatedUser, JwtPayload } from "../auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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
