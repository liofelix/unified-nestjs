import { HttpException, Injectable } from "@nestjs/common";
import { Tool, tool } from "@openai/agents";
import { z } from "zod";
import { WeatherQueryDto } from "../../../weather/dto/weather-query.dto";
import { WeatherService } from "../../../weather/weather.service";

@Injectable()
export class WeatherToolsFactory {
  constructor(private readonly weatherService: WeatherService) {}

  create(): Tool[] {
    return [
      tool({
        name: "get_current_weather",
        description: "查询指定城市的当前天气。仅在用户询问当前或现在天气时调用。",
        parameters: z.object({
          city: z.string().min(2).max(100),
          countryCode: z.string().length(2).optional(),
        }),
        execute: ({ city, countryCode }) =>
          this.weatherService.getCurrentWeather({ city, countryCode }),
        errorFunction: (_context, error) => this.toToolError(error),
        timeoutMs: 10_000,
      }),
      tool({
        name: "get_daily_weather",
        description: "查询指定城市今天或明天的天气。仅在用户询问今天或明天天气时调用。",
        parameters: z.object({
          city: z.string().min(2).max(100),
          countryCode: z.string().length(2).optional(),
          day: z.enum(["today", "tomorrow"]),
        }),
        execute: ({ city, countryCode, day }) =>
          this.weatherService.getDailyWeather({ city, countryCode } satisfies WeatherQueryDto, day),
        errorFunction: (_context, error) => this.toToolError(error),
        timeoutMs: 10_000,
      }),
    ];
  }

  private toToolError(error: unknown): string {
    if (error instanceof HttpException) {
      return error.message;
    }

    return "天气查询失败，请稍后重试。";
  }
}
