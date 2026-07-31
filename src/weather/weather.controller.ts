/**
 * 天气查询控制器。
 * 提供公开的今日和明日天气接口，具体数据获取委托给 WeatherService。
 */
import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { WeatherQueryDto } from "./dto/weather-query.dto";
import { WeatherService } from "./weather.service";

@ApiTags("天气")
/** 处理天气 HTTP 查询请求的控制器。 */
@Controller("weather")
export class WeatherController {
  /** 注入天气领域服务。 */
  constructor(private readonly weatherService: WeatherService) {}

  /** 查询指定城市今天的天气摘要。 */
  @Public()
  @Get("today")
  getTodayWeather(@Query() query: WeatherQueryDto) {
    return this.weatherService.getDailyWeather(query, "today");
  }

  /** 查询指定城市明天的天气摘要。 */
  @Public()
  @Get("tomorrow")
  getTomorrowWeather(@Query() query: WeatherQueryDto) {
    return this.weatherService.getDailyWeather(query, "tomorrow");
  }
}
