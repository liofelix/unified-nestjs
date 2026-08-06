/**
 * JWT 全局守卫单元测试。
 * 验证公开元数据直接放行，其余请求委托 Passport 守卫。
 */
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { JwtAuthGuard } from "./jwt-auth.guard";

function createContext(isPublic: boolean) {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    isPublic,
  };
}

describe("JwtAuthGuard", () => {
  it("公开路由直接放行", () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);

    expect(guard.canActivate(createContext(true) as never)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith("isPublic", expect.any(Array));
  });

  it("受保护路由委托父级 Passport 守卫", () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const parentCanActivate = vi
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), "canActivate")
      .mockReturnValue("passport-result" as never);
    const guard = new JwtAuthGuard(reflector);

    expect(guard.canActivate(createContext(false) as never)).toBe("passport-result");
    expect(parentCanActivate).toHaveBeenCalledTimes(1);
    parentCanActivate.mockRestore();
  });
});
