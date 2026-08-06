/**
 * 根路由控制器单元测试。
 * 验证公开健康入口返回稳定的应用标题。
 */
import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller";

describe("AppController", () => {
  it("返回应用标题", () => {
    expect(new AppController().getTitle()).toBe("Unified NestJS");
  });
});
