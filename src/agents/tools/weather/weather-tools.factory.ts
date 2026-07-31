/**
 * 天气领域工具工厂。
 * 将 WeatherService 的查询能力包装成 OpenAI Agents SDK 可调用的工具，
 * 负责参数 schema、调用超时和面向模型的错误文本，不负责天气数据本身的获取。
 */
import { HttpException, Injectable } from "@nestjs/common";
import { Tool, tool } from "@openai/agents";
import { z } from "zod";
import { WeatherQueryDto } from "../../../weather/dto/weather-query.dto";
import { WeatherService } from "../../../weather/weather.service";

/** 天气工具单次执行的最长等待时间（毫秒）。 */
const TOOL_TIMEOUT_MS = 10_000;

/** 创建天气 Agent 可使用工具的 NestJS Provider。 */
@Injectable()
export class WeatherToolsFactory {
  /** 注入实际执行地理定位和天气查询的领域服务。 */
  constructor(private readonly weatherService: WeatherService) {}

  /**
   * 创建当前天气和今天/明天天气两个工具。
   * 每个工具都限制城市及国家代码格式，并在 10 秒内未完成时终止调用。
   */
  create(): Tool[] {
    return [
      // 只处理“当前/现在”语义，避免与日天气工具混用。
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
        timeoutMs: TOOL_TIMEOUT_MS,
      }),
      // 通过 day 参数区分今天和明天，复用同一个领域查询接口。
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
        timeoutMs: TOOL_TIMEOUT_MS,
      }),
    ];
  }

  /** 将领域异常转换为模型可以理解且不泄露内部细节的工具错误文本。 */
  private toToolError(error: unknown): string {
    if (error instanceof HttpException) {
      return error.message;
    }

    return "天气查询失败，请稍后重试。";
  }
}
