import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix(process.env.APP_API_PREFIX ?? "api");

  const swaggerConfig = new DocumentBuilder()
    .setTitle(process.env.APP_NAME ?? "Unified NestJS")
    .setVersion(process.env.APP_SWAGGER_VERSION ?? "1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    process.env.APP_SWAGGER_PATH ?? "api/docs",
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(process.env.APP_PORT ?? "3000");
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
