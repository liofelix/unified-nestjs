/**
 * 管理员授权守卫单元测试。
 * 验证普通用户被拒绝、当前角色包含 admin 时允许访问。
 */
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AdminGuard } from "./admin.guard";

function createContext(roleCodes: string[]): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: { roleCodes } }),
    }),
  } as ExecutionContext;
}

describe("AdminGuard", () => {
  it("拒绝没有 admin 角色的用户", () => {
    expect(() => new AdminGuard().canActivate(createContext(["user"]))).toThrow(ForbiddenException);
  });

  it("允许当前角色包含 admin 的用户", () => {
    expect(new AdminGuard().canActivate(createContext(["user", "admin"]))).toBe(true);
  });
});
