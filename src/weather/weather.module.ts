/**
 * 天气模块。
 * 注册天气控制器和第三方 Open-Meteo 适配服务，并向 Agent 工具导出 WeatherService。
 */
import { Module } from "@nestjs/common";
import { WeatherController } from "./weather.controller";
import { WeatherService } from "./weather.service";

/** 天气领域的 NestJS 模块。 */
@Module({
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
