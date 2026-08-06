/**
 * 应用 HTTP 运行配置。
 * 将生产启动和测试共用的全局请求校验、参数错误格式化以及 API 前缀集中管理。
 */
import { BadRequestException, type INestApplication, ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { formatValidationErrors } from "./common/messages/api-messages";

/** 可覆盖的 HTTP 应用配置。 */
export interface HttpAppOptions {
  /** HTTP 路由统一前缀。 */
  apiPrefix?: string;
}

/** 为 Nest 应用注册安全响应头、全局校验管道和 API 前缀。 */
export function configureHttpApp(app: INestApplication, options: HttpAppOptions = {}): void {
  app.use(
    helmet({
      // Swagger UI 在非生产环境需要内联脚本；生产环境不暴露 Swagger，因此保留默认 CSP。
      contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => new BadRequestException(formatValidationErrors(errors)),
    }),
  );
  app.setGlobalPrefix(options.apiPrefix ?? process.env.APP_API_PREFIX ?? "api");
}
