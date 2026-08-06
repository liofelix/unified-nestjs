/**
 * 认证服务单元测试。
 * 验证凭据校验、JWT 签发和注销委托，不连接数据库或 Redis。
 */
import { vi } from "vitest";

const bcryptCompare = vi.hoisted(() => vi.fn());
vi.mock("bcrypt", () => ({ compare: bcryptCompare }));

import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  it("校验凭据并签发带 jti 的访问令牌", async () => {
    bcryptCompare.mockResolvedValueOnce(true);
    const usersService = {
      findByUsernameWithPassword: vi.fn().mockResolvedValue({
        id: "user-1",
        username: "alice",
        email: "alice@example.com",
        password: "hashed-password",
      }),
    };
    const jwtService = { sign: vi.fn().mockReturnValue("access-token") };
    const authRevocationService = { revoke: vi.fn() };
    const service = new AuthService(
      usersService as never,
      jwtService as never,
      authRevocationService as never,
    );

    await expect(service.login({ username: "alice", password: "password123" })).resolves.toEqual({
      accessToken: "access-token",
    });
    expect(jwtService.sign).toHaveBeenCalledWith(
      {
        sub: "user-1",
        username: "alice",
        email: "alice@example.com",
        type: "access",
      },
      { jwtid: expect.any(String) },
    );
  });

  it("账号不存在或密码错误时返回未授权", async () => {
    bcryptCompare.mockResolvedValue(false);
    const usersService = {
      findByUsernameWithPassword: vi.fn().mockResolvedValue({ password: "hash" }),
    };
    const service = new AuthService(
      usersService as never,
      { sign: vi.fn() } as never,
      { revoke: vi.fn() } as never,
    );

    await expect(service.login({ username: "alice", password: "wrong" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    usersService.findByUsernameWithPassword.mockResolvedValueOnce(null);
    await expect(service.login({ username: "missing", password: "wrong" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("注销时委托撤销服务保存 tokenId 和过期时间", async () => {
    const authRevocationService = { revoke: vi.fn().mockResolvedValue(undefined) };
    const service = new AuthService({} as never, {} as never, authRevocationService as never);
    const user = {
      id: "user-1",
      username: "alice",
      email: "alice@example.com",
      tokenId: "jti-1",
      expiresAt: 123,
    };

    await service.logout(user);

    expect(authRevocationService.revoke).toHaveBeenCalledWith("jti-1", 123);
  });
});
