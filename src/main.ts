/**
 * 应用启动入口。
 * 创建 NestJS 应用、启用请求校验、注册统一 API 前缀与 Swagger 文档，最后监听配置端口。
 */
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { configureHttpApp } from "./app.config";

/** 创建并启动 HTTP 应用实例。 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局校验负责转换 DTO、移除未知字段，并拒绝未声明的请求属性。
  configureHttpApp(app);

  if (process.env.NODE_ENV !== "production") {
    // Swagger 配置沿用环境变量，便于开发和测试环境调整文档标题、版本和路径。
    const swaggerConfig = new DocumentBuilder()
      .setTitle(process.env.APP_NAME ?? "Unified NestJS")
      .setVersion(process.env.APP_SWAGGER_VERSION ?? "1.0")
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      process.env.APP_SWAGGER_PATH ?? "api/docs",
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
      {
        swaggerOptions: {
          deepLinking: false,
        },
      },
    );
  }

  await app.listen(process.env.APP_PORT ?? "3000");
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
