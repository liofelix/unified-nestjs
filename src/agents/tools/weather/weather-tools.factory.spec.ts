/**
 * 天气工具工厂单元测试。
 * 验证工具名称、参数 schema、领域服务调用和错误文本脱敏。
 */
import { BadGatewayException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { WeatherToolsFactory } from "./weather-tools.factory";

describe("WeatherToolsFactory", () => {
  it("创建当前和每日天气工具并调用领域服务", async () => {
    const weatherService = {
      getCurrentWeather: vi.fn().mockResolvedValue({ temperature: 30 }),
      getDailyWeather: vi.fn().mockResolvedValue({ date: "2026-08-06" }),
    };
    const tools = new WeatherToolsFactory(weatherService as never).create();
    const functionTools = tools.filter(
      (tool): tool is Extract<(typeof tools)[number], { type: "function" }> =>
        tool.type === "function",
    );

    expect(functionTools.map(({ name }) => name)).toEqual([
      "get_current_weather",
      "get_daily_weather",
    ]);
    expect(functionTools.map(({ timeoutMs }) => timeoutMs)).toEqual([10_000, 10_000]);

    await expect(
      functionTools[0]?.invoke({} as never, JSON.stringify({ city: "北京", countryCode: "CN" })),
    ).resolves.toEqual({ temperature: 30 });
    await expect(
      functionTools[1]?.invoke({} as never, JSON.stringify({ city: "北京", day: "tomorrow" })),
    ).resolves.toEqual({ date: "2026-08-06" });
    expect(weatherService.getCurrentWeather).toHaveBeenCalledWith({
      city: "北京",
      countryCode: "CN",
    });
    expect(weatherService.getDailyWeather).toHaveBeenCalledWith(
      { city: "北京", countryCode: undefined },
      "tomorrow",
    );
  });

  it("把 HTTP 异常和未知异常转换为安全错误文本", async () => {
    const weatherService = {
      getCurrentWeather: vi.fn().mockRejectedValue(new BadGatewayException("天气服务暂不可用")),
      getDailyWeather: vi.fn(),
    };
    const tool = new WeatherToolsFactory(weatherService as never)
      .create()
      .find(
        (candidate): candidate is Extract<typeof candidate, { type: "function" }> =>
          candidate.type === "function",
      );

    await expect(tool?.invoke({} as never, JSON.stringify({ city: "北京" }))).resolves.toBe(
      "天气服务暂不可用",
    );

    const unknownErrorTool = new WeatherToolsFactory({
      getCurrentWeather: vi.fn().mockRejectedValue(new Error("secret")),
      getDailyWeather: vi.fn(),
    } as never)
      .create()
      .find(
        (candidate): candidate is Extract<typeof candidate, { type: "function" }> =>
          candidate.type === "function",
      );
    await expect(
      unknownErrorTool?.invoke({} as never, JSON.stringify({ city: "北京" })),
    ).resolves.toBe("天气查询失败，请稍后重试。");
  });
});
