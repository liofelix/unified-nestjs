/**
 * 统一 HTTP 消息格式化测试。
 * 覆盖校验树、Nest 默认异常文案、UUID 文案和未知状态码兜底。
 */
import { describe, expect, it } from "vitest";
import { formatValidationErrors, normalizeHttpMessage } from "./api-messages";

describe("api-messages", () => {
  it("递归格式化校验错误并保留中文自定义消息", () => {
    expect(
      formatValidationErrors([
        {
          property: "email",
          constraints: { isEmail: "email must be an email" },
          children: [],
        },
        {
          property: "profile",
          constraints: undefined,
          children: [
            {
              property: "name",
              constraints: { minLength: "name must be longer than or equal to 3 characters" },
              children: [],
            },
          ],
        },
        {
          property: "status",
          constraints: { custom: "状态不合法" },
          children: [],
        },
      ]),
    ).toEqual(["email 必须是有效的邮箱地址", "profile.name 长度不能少于 3 个字符", "状态不合法"]);
  });

  it("没有可用校验约束时返回通用错误", () => {
    expect(formatValidationErrors([])).toEqual(["请求数据校验失败"]);
    expect(
      formatValidationErrors([
        { property: "value", constraints: { custom: "value is invalid" }, children: [] },
      ]),
    ).toEqual(["value 校验失败"]);
  });

  it("规范化标准异常、路由错误和 UUID 错误", () => {
    expect(normalizeHttpMessage(["Bad Request", "Unauthorized"], 400)).toBe(
      "请求参数错误；未授权，请先登录",
    );
    expect(normalizeHttpMessage("Cannot GET /missing", 404)).toBe("请求的接口不存在");
    expect(normalizeHttpMessage("Validation failed (uuid v4 is expected)", 400)).toBe(
      "参数必须是有效的 UUID v4",
    );
    expect(normalizeHttpMessage("The value passed as UUID is not a string", 400)).toBe(
      "UUID 参数必须是字符串",
    );
  });

  it("对空消息和未知状态码使用兜底文案", () => {
    expect(normalizeHttpMessage("", 418)).toBe("请求处理失败");
    expect(normalizeHttpMessage([], 400)).toBe("请求参数错误");
    expect(normalizeHttpMessage("plain english", 400)).toBe("请求参数错误");
  });
});
