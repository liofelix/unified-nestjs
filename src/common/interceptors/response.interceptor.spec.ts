/**
 * 统一成功响应拦截器单元测试。
 * 验证普通 HTTP 返回值包装和 SSE 路由透传行为。
 */
import { SSE_METADATA } from "@nestjs/common/constants";
import { firstValueFrom, of } from "rxjs";
import { describe, expect, it } from "vitest";
import { ResponseInterceptor } from "./response.interceptor";

describe("ResponseInterceptor", () => {
  it("将普通返回值包装为统一响应", async () => {
    const handler = () => undefined;
    const context = {
      getHandler: () => handler,
      switchToHttp: () => ({ getResponse: () => ({ statusCode: 201 }) }),
    };
    const next = { handle: () => of({ id: "resource-1" }) };

    await expect(
      firstValueFrom(new ResponseInterceptor().intercept(context as never, next)),
    ).resolves.toEqual({ code: 201, data: { id: "resource-1" }, msg: "操作成功" });
  });

  it("将 undefined 数据归一化为 null", async () => {
    const context = {
      getHandler: () => function handler() {},
      switchToHttp: () => ({ getResponse: () => ({ statusCode: 200 }) }),
    };

    await expect(
      firstValueFrom(
        new ResponseInterceptor().intercept(context as never, { handle: () => of(undefined) }),
      ),
    ).resolves.toEqual({ code: 200, data: null, msg: "操作成功" });
  });

  it("透传 SSE 事件而不套用普通响应结构", async () => {
    const handler = () => undefined;
    Reflect.defineMetadata(SSE_METADATA, true, handler);
    const context = {
      getHandler: () => handler,
      switchToHttp: () => ({ getResponse: () => ({ statusCode: 200 }) }),
    };

    await expect(
      firstValueFrom(
        new ResponseInterceptor().intercept(context as never, {
          handle: () => of({ type: "delta" }),
        }),
      ),
    ).resolves.toEqual({ type: "delta" });
  });
});
