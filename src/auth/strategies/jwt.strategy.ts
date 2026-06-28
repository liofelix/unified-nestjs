import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtAuthenticatedUser, JwtPayload, JwtTokenType } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): JwtAuthenticatedUser {
    if (payload.type !== JwtTokenType.ACCESS) {
      throw new UnauthorizedException('无效的访问令牌');
    }

    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
    };
  }
}
