/**
 * 全局成功响应拦截器。
 * 为普通 HTTP 返回值包装统一响应结构，同时保留 SSE 流的原始事件格式。
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { SSE_METADATA } from "@nestjs/common/constants";
import { map, Observable } from "rxjs";

/** 应用对外统一返回的成功响应结构。 */
export interface ApiResponse<T> {
  /** HTTP 状态码。 */
  code: number;
  /** 业务数据；空返回值会归一化为 null。 */
  data: T | null;
  /** 面向客户端的结果消息。 */
  msg: string;
}

/** 将普通控制器返回值包装为统一响应的全局拦截器。 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  /** SSE 路由直接透传事件，普通路由则映射为 ApiResponse。 */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (Reflect.getMetadata(SSE_METADATA, context.getHandler())) {
      return next.handle();
    }

    const httpResponse = context.switchToHttp().getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map(
        (data): ApiResponse<unknown> => ({
          code: httpResponse.statusCode,
          data: data ?? null,
          msg: "success",
        }),
      ),
    );
  }
}
