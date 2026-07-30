import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { SSE_METADATA } from "@nestjs/common/constants";
import { map, Observable } from "rxjs";

export interface ApiResponse<T> {
  code: number;
  data: T | null;
  msg: string;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
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
