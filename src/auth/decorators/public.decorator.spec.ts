/**
 * 公开路由装饰器单元测试。
 * 验证守卫读取的元数据键和值保持稳定。
 */
import { describe, expect, it } from "vitest";
import { IS_PUBLIC_KEY, Public } from "./public.decorator";

describe("Public decorator", () => {
  it("写入公开路由元数据", () => {
    class TestController {
      handler() {}
    }

    const descriptor = Object.getOwnPropertyDescriptor(TestController.prototype, "handler");
    Public()(TestController.prototype, "handler", descriptor as PropertyDescriptor);

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TestController.prototype.handler)).toBe(true);
  });
});
