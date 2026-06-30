import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../auth.types';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy({
      getOrThrow: jest.fn().mockReturnValue('jwt-secret'),
    } as unknown as ConfigService);
  });

  it('returns the authenticated user for access tokens', () => {
    const payload: JwtPayload = {
      sub: 'e0716b8b-d8d7-47fd-a0d3-78d00480b12f',
      username: 'alice',
      email: 'alice@example.com',
      type: 'access',
    };

    expect(strategy.validate(payload)).toEqual({
      id: payload.sub,
      username: payload.username,
      email: payload.email,
    });
  });

  it('rejects non-access tokens', () => {
    const payload: JwtPayload = {
      sub: 'e0716b8b-d8d7-47fd-a0d3-78d00480b12f',
      username: 'alice',
      email: 'alice@example.com',
      type: 'refresh',
    };

    expect(() => strategy.validate(payload)).toThrow(
      new UnauthorizedException('无效的访问令牌'),
    );
  });
});
