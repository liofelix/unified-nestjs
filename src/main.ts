import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { getStartupConfig, setAppConfig, setSwaggerConfig } from "./common/utils/startup.util";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const startupConfig = getStartupConfig();

  setAppConfig(app, startupConfig.appApiPrefix);
  setSwaggerConfig(app, startupConfig);

  await app.listen(startupConfig.appPort);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
