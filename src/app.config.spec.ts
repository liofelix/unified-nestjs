/**
 * HTTP 应用配置单元测试。
 * 验证全局管道和 API 前缀由共享配置函数注册。
 */
import type { INestApplication } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { configureHttpApp } from "./app.config";

describe("configureHttpApp", () => {
  it("注册全局校验管道并设置指定前缀", () => {
    const app = {
      use: vi.fn(),
      useGlobalPipes: vi.fn(),
      setGlobalPrefix: vi.fn(),
    } as unknown as INestApplication;

    configureHttpApp(app, { apiPrefix: "test-api" });

    expect(app.use).toHaveBeenCalledTimes(1);
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(app.setGlobalPrefix).toHaveBeenCalledWith("test-api");
  });
});
