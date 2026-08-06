/**
 * JWT 策略单元测试。
 * 验证载荷业务字段、撤销状态和请求用户上下文转换。
 */
import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";
import { AuthRevocationService } from "../auth.revocation.service";
import { JwtStrategy } from "./jwt.strategy";

function createStrategy(isRevoked = false) {
  const authRevocationService = {
    isRevoked: async () => isRevoked,
  } as unknown as AuthRevocationService;
  const configService = {
    getOrThrow: () => "test-secret",
  } as unknown as ConfigService;
  const usersService = {
    findActiveAuthContext: async () => ({
      id: "user-1",
      username: "current-alice",
      email: "current@example.com",
      roleCodes: ["user"],
    }),
  };

  return new JwtStrategy(configService, authRevocationService, usersService as never);
}

describe("JwtStrategy", () => {
  it("拒绝非 access 类型或缺少 jti/exp 的载荷", async () => {
    const strategy = createStrategy();

    await expect(
      strategy.validate({ type: "refresh", jti: "jti", exp: 1 } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(strategy.validate({ type: "access", exp: 1 } as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("拒绝已撤销的令牌", async () => {
    const strategy = createStrategy(true);

    await expect(
      strategy.validate({
        sub: "user-1",
        username: "alice",
        email: "alice@example.com",
        type: "access",
        jti: "jti-1",
        exp: 1_700_000_000,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("将合法载荷转换为数据库中的最新认证用户上下文", async () => {
    const strategy = createStrategy();
    const payload = {
      sub: "user-1",
      username: "alice",
      email: "alice@example.com",
      type: "access",
      jti: "jti-1",
      exp: 1_700_000_000,
    };

    await expect(strategy.validate(payload)).resolves.toEqual({
      id: "user-1",
      username: "current-alice",
      email: "current@example.com",
      tokenId: "jti-1",
      expiresAt: 1_700_000_000,
      roleCodes: ["user"],
    });
  });

  it("用户已软删除或不存在时拒绝旧令牌", async () => {
    const strategy = new JwtStrategy(
      { getOrThrow: () => "test-secret" } as unknown as ConfigService,
      { isRevoked: async () => false } as unknown as AuthRevocationService,
      { findActiveAuthContext: async () => null } as never,
    );

    await expect(
      strategy.validate({
        sub: "user-1",
        username: "alice",
        email: "alice@example.com",
        type: "access",
        jti: "jti-1",
        exp: 1_700_000_000,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
