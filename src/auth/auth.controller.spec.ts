/**
 * 认证控制器单元测试。
 * 验证登录和注销请求只负责转发参数及认证上下文。
 */
import { describe, expect, it, vi } from "vitest";
import { AuthController } from "./auth.controller";

describe("AuthController", () => {
  it("转发登录参数", async () => {
    const authService = { login: vi.fn().mockResolvedValue({ accessToken: "token" }) };
    const controller = new AuthController(authService as never);
    const dto = { username: "alice", password: "password123" };

    await expect(controller.login(dto)).resolves.toEqual({ accessToken: "token" });
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it("从请求上下文转发注销用户", async () => {
    const authService = { logout: vi.fn().mockResolvedValue(undefined) };
    const controller = new AuthController(authService as never);
    const user = {
      id: "user-1",
      username: "alice",
      email: "alice@example.com",
      tokenId: "jti",
      expiresAt: 123,
    };

    await controller.logout({ user } as never);

    expect(authService.logout).toHaveBeenCalledWith(user);
  });
});
