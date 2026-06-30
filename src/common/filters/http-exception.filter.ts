import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import type { ApiResponse } from "../interceptors/response.interceptor";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
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
