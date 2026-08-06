/**
 * 天气服务单元测试。
 * 通过替换 fetch 覆盖 Open-Meteo 请求参数、响应规范化和上游故障映射。
 */
import { BadGatewayException, NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WeatherService } from "./weather.service";

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("WeatherService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("查询当前天气并规范化位置、温度和风力", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              name: "北京",
              country: "中国",
              admin1: "北京市",
              latitude: 39.9,
              longitude: 116.4,
              timezone: "Asia/Shanghai",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          current: {
            time: "2026-08-06T10:00",
            temperature_2m: 30,
            apparent_temperature: 32,
            weather_code: 0,
            wind_speed_10m: 12,
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new WeatherService().getCurrentWeather({ city: "北京", countryCode: "CN" }),
    ).resolves.toEqual({
      location: {
        name: "北京",
        country: "中国",
        admin1: "北京市",
        latitude: 39.9,
        longitude: 116.4,
        timezone: "Asia/Shanghai",
      },
      time: "2026-08-06T10:00",
      weather: { code: 0, description: "晴朗" },
      temperature: { actual: 30, apparent: 32, unit: "°C" },
      wind: { speed: 12, unit: "km/h" },
    });

    const geocodingUrl = String(fetchMock.mock.calls[0]?.[0]);
    const forecastUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(geocodingUrl).toContain("name=%E5%8C%97%E4%BA%AC");
    expect(geocodingUrl).toContain("countryCode=CN");
    expect(forecastUrl).toContain(
      "current=temperature_2m%2Capparent_temperature%2Cweather_code%2Cwind_speed_10m",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("选择明天的每日预报并识别未知天气代码", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [{ name: "上海", latitude: 31, longitude: 121, timezone: "Asia/Shanghai" }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          daily: {
            time: ["2026-08-06", "2026-08-07"],
            weather_code: [0, 123],
            temperature_2m_min: [24, 25],
            temperature_2m_max: [34, 35],
            precipitation_probability_max: [10, 20],
            precipitation_sum: [0, 1.2],
            wind_speed_10m_max: [14, 16],
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new WeatherService().getDailyWeather({ city: "上海" }, "tomorrow"),
    ).resolves.toMatchObject({
      date: "2026-08-07",
      weather: { code: 123, description: "未知天气" },
      temperature: { min: 25, max: 35, unit: "°C" },
      precipitation: { probabilityMax: 20, amount: 1.2, unit: "mm" },
      wind: { speedMax: 16, unit: "km/h" },
    });
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("forecast_days=2");
  });

  it("找不到城市时返回 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ results: [] })));

    await expect(new WeatherService().getCurrentWeather({ city: "不存在" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("网络、HTTP 和 JSON 响应异常都映射为 502", async () => {
    const service = new WeatherService();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(service.getCurrentWeather({ city: "北京" })).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));
    await expect(service.getCurrentWeather({ city: "北京" })).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error("invalid json")),
      }),
    );
    await expect(service.getCurrentWeather({ city: "北京" })).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it("第三方缺少必需字段时返回 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            results: [{ name: "北京", latitude: 39, longitude: 116, timezone: "Asia/Shanghai" }],
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ current: { time: "now" } })),
    );

    await expect(new WeatherService().getCurrentWeather({ city: "北京" })).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it("复用短期地理编码缓存，但每次仍获取最新天气", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [{ name: "北京", latitude: 39.9, longitude: 116.4, timezone: "Asia/Shanghai" }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          current: {
            time: "2026-08-06T10:00",
            temperature_2m: 30,
            apparent_temperature: 32,
            weather_code: 0,
            wind_speed_10m: 12,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          current: {
            time: "2026-08-06T11:00",
            temperature_2m: 31,
            apparent_temperature: 33,
            weather_code: 1,
            wind_speed_10m: 13,
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const service = new WeatherService();

    await service.getCurrentWeather({ city: "北京", countryCode: "CN" });
    await expect(
      service.getCurrentWeather({ city: "北京", countryCode: "CN" }),
    ).resolves.toMatchObject({
      time: "2026-08-06T11:00",
      temperature: { actual: 31 },
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("geocoding-api.open-meteo.com");
  });

  it("上游地理编码结构非法时返回 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ results: [{ latitude: 39, longitude: 116 }] })),
    );

    await expect(new WeatherService().getCurrentWeather({ city: "北京" })).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
