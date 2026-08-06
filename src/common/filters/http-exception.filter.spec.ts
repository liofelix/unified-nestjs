/**
 * 全局异常过滤器单元测试。
 * 验证 HTTP 异常和未知异常都输出统一的安全响应结构。
 */
import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { HttpExceptionFilter } from "./http-exception.filter";

function createHost() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  };

  return { host: host as never, response };
}

describe("HttpExceptionFilter", () => {
  it("格式化字符串 HTTP 异常", () => {
    const { host, response } = createHost();

    new HttpExceptionFilter().catch(new BadRequestException("参数错误"), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ code: 400, data: null, msg: "参数错误" });
  });

  it("格式化异常消息数组", () => {
    const { host, response } = createHost();

    new HttpExceptionFilter().catch(new BadRequestException(["Bad Request", "Unauthorized"]), host);

    expect(response.json).toHaveBeenCalledWith({
      code: 400,
      data: null,
      msg: "请求参数错误；未授权，请先登录",
    });
  });

  it("隐藏未知异常细节", () => {
    const { host, response } = createHost();

    new HttpExceptionFilter().catch(new Error("database password"), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ code: 500, data: null, msg: "服务器内部错误" });
  });

  it("使用 Nest 异常对象的默认状态和消息", () => {
    const { host, response } = createHost();

    new HttpExceptionFilter().catch(new InternalServerErrorException(), host);

    expect(response.json).toHaveBeenCalledWith({ code: 500, data: null, msg: "服务器内部错误" });
  });
});
