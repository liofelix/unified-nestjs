import { BadGatewayException, Injectable, NotFoundException } from "@nestjs/common";
import { WeatherQueryDto } from "./dto/weather-query.dto";
import {
  WeatherCurrentSummary,
  WeatherDailySummary,
  WeatherDay,
  WeatherLocation,
} from "./weather.types";

const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const WEATHER_PROVIDER_UNAVAILABLE_MESSAGE = "天气服务暂不可用";
const CITY_NOT_FOUND_MESSAGE = "未找到匹配的城市";
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
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  admin1?: string;
}

interface GeocodingResponse {
  results?: GeocodingLocation[];
}

interface ForecastResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
    precipitation_probability_max?: number[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
  };
}

@Injectable()
export class WeatherService {
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

  private describeWeatherCode(weatherCode: number): string {
    return WEATHER_CODE_DESCRIPTIONS[weatherCode] ?? "未知天气";
  }

  private isNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
  }
}
