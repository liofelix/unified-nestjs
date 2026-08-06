/**
 * 天气控制器单元测试。
 * 验证今日和明日路由向天气服务传递正确日期语义。
 */
import { describe, expect, it, vi } from "vitest";
import { WeatherController } from "./weather.controller";

describe("WeatherController", () => {
  it("分别转发 today 和 tomorrow 查询", async () => {
    const weatherService = {
      getDailyWeather: vi.fn().mockResolvedValue({ date: "2026-08-06" }),
    };
    const controller = new WeatherController(weatherService as never);
    const query = { city: "北京", countryCode: "CN" };

    await expect(controller.getTodayWeather(query)).resolves.toEqual({ date: "2026-08-06" });
    await controller.getTomorrowWeather(query);

    expect(weatherService.getDailyWeather).toHaveBeenNthCalledWith(1, query, "today");
    expect(weatherService.getDailyWeather).toHaveBeenNthCalledWith(2, query, "tomorrow");
  });
});
