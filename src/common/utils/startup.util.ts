import { INestApplication, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export interface StartupConfig {
  appName: string;
  appPort: string;
  appApiPrefix: string;
  appSwaggerPath: string;
  appSwaggerVersion: string;
}

export function getStartupConfig(): StartupConfig {
  return {
    appName: process.env.APP_NAME ?? "Unified NestJS",
    appPort: process.env.APP_PORT ?? "3000",
    appApiPrefix: process.env.APP_API_PREFIX ?? "api",
    appSwaggerPath: process.env.APP_SWAGGER_PATH ?? "api/docs",
    appSwaggerVersion: process.env.APP_SWAGGER_VERSION ?? "1.0",
  };
}

export function setAppConfig(app: INestApplication, appApiPrefix: string): void {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix(appApiPrefix);
}

export function setSwaggerConfig(app: INestApplication, config: StartupConfig): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.appName)
    .setVersion(config.appSwaggerVersion)
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(config.appSwaggerPath, app, swaggerDocument);
}
