import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { WeatherQueryDto } from "./dto/weather-query.dto";
import { WeatherService } from "./weather.service";

@ApiTags("天气")
@Controller("weather")
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Public()
  @Get("today")
  getTodayWeather(@Query() query: WeatherQueryDto) {
    return this.weatherService.getDailyWeather(query, "today");
  }

  @Public()
  @Get("tomorrow")
  getTomorrowWeather(@Query() query: WeatherQueryDto) {
    return this.weatherService.getDailyWeather(query, "tomorrow");
  }
}
