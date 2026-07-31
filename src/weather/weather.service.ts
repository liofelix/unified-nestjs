/**
 * 天气领域服务。
 * 适配 Open-Meteo 地理编码与预报接口，校验第三方响应并转换为稳定的领域返回结构。
 */
import { BadGatewayException, Injectable, NotFoundException } from "@nestjs/common";
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

interface GeocodingLocation {
  /** 地理编码返回的城市名称。 */
  name: string;
  /** 纬度。 */
  latitude: number;
  /** 经度。 */
  longitude: number;
  /** 时区标识。 */
  timezone: string;
  /** 国家名称。 */
  country?: string;
  /** 一级行政区名称。 */
  admin1?: string;
}

/** Open-Meteo 地理编码响应的最小结构。 */
interface GeocodingResponse {
  /** 按匹配度排序的地点结果。 */
  results?: GeocodingLocation[];
}

/** Open-Meteo 预报响应中当前和每日字段的最小结构。 */
interface ForecastResponse {
  current?: {
    /** 当前观测时间。 */
    time?: string;
    /** 当前实际温度。 */
    temperature_2m?: number;
    /** 当前体感温度。 */
    apparent_temperature?: number;
    /** 当前 WMO 天气代码。 */
    weather_code?: number;
    /** 当前风速。 */
    wind_speed_10m?: number;
  };
  daily?: {
    /** 预报日期数组。 */
    time?: string[];
    /** 每日 WMO 天气代码。 */
    weather_code?: number[];
    /** 每日最低温度。 */
    temperature_2m_min?: number[];
    /** 每日最高温度。 */
    temperature_2m_max?: number[];
    /** 每日最高降水概率。 */
    precipitation_probability_max?: number[];
    /** 每日降水量。 */
    precipitation_sum?: number[];
    /** 每日最大风速。 */
    wind_speed_10m_max?: number[];
  };
}

/** 负责查询并规范化当前和每日天气数据。 */
@Injectable()
export class WeatherService {
  /** 查询指定城市当前天气，并校验所有必需字段。 */
  async getCurrentWeather(query: WeatherQueryDto): Promise<WeatherCurrentSummary> {
    const location = await this.resolveLocation(query);
    const response = await this.getForecast(location, {
      current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
    });
    const current = response.current;

    if (
      !current ||
      typeof current.time !== "string" ||
      !this.isNumber(current.temperature_2m) ||
      !this.isNumber(current.apparent_temperature) ||
      !this.isNumber(current.weather_code) ||
      !this.isNumber(current.wind_speed_10m)
    ) {
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

    const date = daily?.time?.[dayIndex];
    const weatherCode = daily?.weather_code?.[dayIndex];
    const minTemperature = daily?.temperature_2m_min?.[dayIndex];
    const maxTemperature = daily?.temperature_2m_max?.[dayIndex];
    const precipitationProbability = daily?.precipitation_probability_max?.[dayIndex];
    const precipitationAmount = daily?.precipitation_sum?.[dayIndex];
    const windSpeed = daily?.wind_speed_10m_max?.[dayIndex];

    if (
      typeof date !== "string" ||
      !this.isNumber(weatherCode) ||
      !this.isNumber(minTemperature) ||
      !this.isNumber(maxTemperature) ||
      !this.isNumber(precipitationProbability) ||
      !this.isNumber(precipitationAmount) ||
      !this.isNumber(windSpeed)
    ) {
      throw new BadGatewayException(WEATHER_PROVIDER_UNAVAILABLE_MESSAGE);
    }

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
    const url = new URL(GEOCODING_ENDPOINT);
    url.searchParams.set("name", query.city);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "zh");

    if (query.countryCode) {
      url.searchParams.set("countryCode", query.countryCode);
    }

    const response = await this.fetchJson<GeocodingResponse>(url);
    const location = response.results?.[0];

    if (
      !location ||
      !this.isNumber(location.latitude) ||
      !this.isNumber(location.longitude) ||
      !location.timezone
    ) {
      throw new NotFoundException(CITY_NOT_FOUND_MESSAGE);
    }

    return {
      name: location.name,
      country: location.country ?? "",
      admin1: location.admin1,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    };
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

    return this.fetchJson<ForecastResponse>(url);
  }

  /** 在固定超时内读取 JSON，并把网络或 HTTP 错误统一映射为网关异常。 */
  private async fetchJson<T>(url: URL): Promise<T> {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (response.ok) {
        return (await response.json()) as T;
      }
    } catch {
      // 统一在下方转换为天气服务不可用。
    }

    throw new BadGatewayException(WEATHER_PROVIDER_UNAVAILABLE_MESSAGE);
  }

  /** 把 WMO 数字天气代码转换成中文描述。 */
  private describeWeatherCode(weatherCode: number): string {
    return WEATHER_CODE_DESCRIPTIONS[weatherCode] ?? "未知天气";
  }

  /** 判断第三方响应字段是否为有限数字。 */
  private isNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
  }
}
