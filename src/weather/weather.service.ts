/**
 * 天气领域服务。
 * 适配 Open-Meteo 地理编码与预报接口，校验第三方响应并转换为稳定的领域返回结构。
 */
import { BadGatewayException, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { WeatherQueryDto } from "./dto/weather-query.dto";
import {
  WeatherCurrentSummary,
  WeatherDailySummary,
  WeatherDay,
  WeatherLocation,
} from "./weather.types";

/** Open-Meteo 地理编码接口地址。 */
const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
/** Open-Meteo 天气预报接口地址。 */
const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
/** 第三方天气响应缺失或请求失败时的统一错误消息。 */
const WEATHER_PROVIDER_UNAVAILABLE_MESSAGE = "天气服务暂不可用";
/** 地理编码无匹配城市时的错误消息。 */
const CITY_NOT_FOUND_MESSAGE = "未找到匹配的城市";
/** 地理编码缓存时长，降低同一城市连续查询的上游请求量。 */
const LOCATION_CACHE_TTL_MS = 10 * 60 * 1_000;
/** 地理编码缓存的最大条目数，避免大量不同城市查询导致进程内存持续增长。 */
const MAX_LOCATION_CACHE_SIZE = 256;
/** WMO 天气代码到中文描述的映射。 */
const WEATHER_CODE_DESCRIPTIONS: Record<number, string> = {
  0: "晴朗",
  1: "大部晴朗",
  2: "多云",
  3: "阴",
  45: "雾",
  48: "雾",
  51: "毛毛雨",
  53: "毛毛雨",
  55: "毛毛雨",
  56: "冻毛毛雨",
  57: "冻毛毛雨",
  61: "雨",
  63: "雨",
  65: "雨",
  66: "冻雨",
  67: "冻雨",
  71: "雪",
  73: "雪",
  75: "雪",
  77: "雪",
  80: "阵雨",
  81: "阵雨",
  82: "阵雨",
  85: "阵雪",
  86: "阵雪",
  95: "雷暴",
  96: "伴冰雹的雷暴",
  99: "伴冰雹的雷暴",
};

const finiteNumber = z.number().refine(Number.isFinite);
const geocodingLocationSchema = z.object({
  name: z.string().min(1),
  latitude: finiteNumber,
  longitude: finiteNumber,
  timezone: z.string().min(1),
  country: z.string().optional(),
  admin1: z.string().optional(),
});
const geocodingResponseSchema = z.object({
  results: z.array(geocodingLocationSchema).optional(),
});
const currentForecastSchema = z.object({
  time: z.string().min(1),
  temperature_2m: finiteNumber,
  apparent_temperature: finiteNumber,
  weather_code: finiteNumber,
  wind_speed_10m: finiteNumber,
});
const dailyForecastSchema = z.object({
  time: z.array(z.string().min(1)).min(2),
  weather_code: z.array(finiteNumber).min(2),
  temperature_2m_min: z.array(finiteNumber).min(2),
  temperature_2m_max: z.array(finiteNumber).min(2),
  precipitation_probability_max: z.array(finiteNumber).min(2),
  precipitation_sum: z.array(finiteNumber).min(2),
  wind_speed_10m_max: z.array(finiteNumber).min(2),
});
/** Open-Meteo 预报响应的运行时校验结构。 */
const forecastResponseSchema = z.object({
  current: currentForecastSchema.optional(),
  daily: dailyForecastSchema.optional(),
});
type ForecastResponse = z.infer<typeof forecastResponseSchema>;

interface CachedLocation {
  location: WeatherLocation;
  expiresAt: number;
}

/** 负责查询并规范化当前和每日天气数据。 */
@Injectable()
export class WeatherService {
  private readonly locationCache = new Map<string, CachedLocation>();

  /** 查询指定城市当前天气，并校验所有必需字段。 */
  async getCurrentWeather(query: WeatherQueryDto): Promise<WeatherCurrentSummary> {
    const location = await this.resolveLocation(query);
    const response = await this.getForecast(location, {
      current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
    });
    const current = response.current;

    if (!current) {
      throw new BadGatewayException(WEATHER_PROVIDER_UNAVAILABLE_MESSAGE);
    }

    return {
      location,
      time: current.time,
      weather: {
        code: current.weather_code,
        description: this.describeWeatherCode(current.weather_code),
      },
      temperature: {
        actual: current.temperature_2m,
        apparent: current.apparent_temperature,
        unit: "°C",
      },
      wind: {
        speed: current.wind_speed_10m,
        unit: "km/h",
      },
    };
  }

  /** 查询指定城市今天或明天的天气，并校验每日预报字段。 */
  async getDailyWeather(query: WeatherQueryDto, day: WeatherDay): Promise<WeatherDailySummary> {
    const location = await this.resolveLocation(query);
    const response = await this.getForecast(location, {
      daily:
        "weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max,precipitation_sum,wind_speed_10m_max",
      forecast_days: "2",
    });
    const dayIndex = day === "today" ? 0 : 1;
    const daily = response.daily;

    if (!daily) {
      throw new BadGatewayException(WEATHER_PROVIDER_UNAVAILABLE_MESSAGE);
    }

    const date = daily.time[dayIndex];
    const weatherCode = daily.weather_code[dayIndex];
    const minTemperature = daily.temperature_2m_min[dayIndex];
    const maxTemperature = daily.temperature_2m_max[dayIndex];
    const precipitationProbability = daily.precipitation_probability_max[dayIndex];
    const precipitationAmount = daily.precipitation_sum[dayIndex];
    const windSpeed = daily.wind_speed_10m_max[dayIndex];

    return {
      location,
      date,
      weather: {
        code: weatherCode,
        description: this.describeWeatherCode(weatherCode),
      },
      temperature: {
        min: minTemperature,
        max: maxTemperature,
        unit: "°C",
      },
      precipitation: {
        probabilityMax: precipitationProbability,
        amount: precipitationAmount,
        unit: "mm",
      },
      wind: {
        speedMax: windSpeed,
        unit: "km/h",
      },
    };
  }

  /** 将城市名称解析为包含坐标和时区的标准位置。 */
  private async resolveLocation(query: WeatherQueryDto): Promise<WeatherLocation> {
    const cacheKey = `${query.city.trim().toLocaleLowerCase()}|${query.countryCode ?? ""}`;
    const cached = this.locationCache.get(cacheKey);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        return cached.location;
      }

      this.locationCache.delete(cacheKey);
    }

    const url = new URL(GEOCODING_ENDPOINT);
    url.searchParams.set("name", query.city);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "zh");

    if (query.countryCode) {
      url.searchParams.set("countryCode", query.countryCode);
    }

    const response = await this.fetchJson(url, geocodingResponseSchema);
    const location = response.results?.[0];

    if (!location) {
      throw new NotFoundException(CITY_NOT_FOUND_MESSAGE);
    }

    const normalizedLocation: WeatherLocation = {
      name: location.name,
      country: location.country ?? "",
      admin1: location.admin1,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    };
    if (!this.locationCache.has(cacheKey) && this.locationCache.size >= MAX_LOCATION_CACHE_SIZE) {
      const oldest = this.locationCache.keys().next();
      if (!oldest.done) {
        this.locationCache.delete(oldest.value);
      }
    }
    this.locationCache.set(cacheKey, {
      location: normalizedLocation,
      expiresAt: Date.now() + LOCATION_CACHE_TTL_MS,
    });

    return normalizedLocation;
  }

  /** 根据位置和字段参数请求 Open-Meteo 预报接口。 */
  private async getForecast(
    location: WeatherLocation,
    parameters: Record<string, string>,
  ): Promise<ForecastResponse> {
    const url = new URL(FORECAST_ENDPOINT);
    url.searchParams.set("latitude", String(location.latitude));
    url.searchParams.set("longitude", String(location.longitude));
    url.searchParams.set("timezone", "auto");

    for (const [name, value] of Object.entries(parameters)) {
      url.searchParams.set(name, value);
    }

    return this.fetchJson(url, forecastResponseSchema);
  }

  /** 在固定超时内读取并校验 JSON，把网络或 HTTP 错误统一映射为网关异常。 */
  private async fetchJson<T>(url: URL, schema: z.ZodType<T>): Promise<T> {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) {
        throw new Error("weather provider returned a non-success status");
      }

      const parsed = schema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error("weather provider returned an invalid response");
      }

      return parsed.data;
    } catch {
      // 统一在下方转换为天气服务不可用。
    }

    throw new BadGatewayException(WEATHER_PROVIDER_UNAVAILABLE_MESSAGE);
  }

  /** 把 WMO 数字天气代码转换成中文描述。 */
  private describeWeatherCode(weatherCode: number): string {
    return WEATHER_CODE_DESCRIPTIONS[weatherCode] ?? "未知天气";
  }
}
