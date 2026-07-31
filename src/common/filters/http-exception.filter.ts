/**
 * 全局 HTTP 异常过滤器。
 * 将 NestJS 异常和未捕获异常统一转换为 `{ code, data, msg }` 响应结构。
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import type { ApiResponse } from "../interceptors/response.interceptor";

/** 负责把异常安全地映射为客户端可消费的错误响应。 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  /** 从 HTTP 上下文取得响应并写入统一错误结构。 */
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody: ApiResponse<null> = {
      code: statusCode,
      data: null,
      msg: this.getMessage(exception),
    };

    response.status(statusCode).json(responseBody);
  }

  /** 提取字符串、字符串数组或 NestJS 异常默认消息。 */
  private getMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return "Internal server error";
    }

    const exceptionBody = exception.getResponse();

    if (typeof exceptionBody === "string") {
      return exceptionBody;
    }

    const message =
      typeof exceptionBody === "object" && exceptionBody !== null && "message" in exceptionBody
        ? (exceptionBody as { message?: unknown }).message
        : exception.message;

    if (Array.isArray(message)) {
      return message.join("; ");
    }

    return typeof message === "string" ? message : exception.message;
  }
}
