/**
 * 天气 Agent 服务单元测试。
 * 验证天气工具、安全 Guardrail、Agent 指令组装和流式委托。
 */
import { Agent } from "@openai/agents";
import { describe, expect, it, vi } from "vitest";
import type { AgentStreamInput } from "../../agents.types";
import { WeatherAgentService } from "./weather-agent.service";

describe("WeatherAgentService", () => {
  it("创建带工具和双侧 Guardrail 的天气 Agent", () => {
    const tools = [{ name: "weather-tool" }];
    const weatherToolsFactory = { create: vi.fn().mockReturnValue(tools) };
    const service = new WeatherAgentService(
      { stream: vi.fn() } as never,
      weatherToolsFactory as never,
    );

    const agent = service.createAgent();
    const cachedAgent = service.createAgent();

    expect(service.metadata).toEqual({
      code: "weather",
      name: "天气助手",
      description: "查询当前、今天和明天的天气",
    });
    expect(agent).toBeInstanceOf(Agent);
    expect(cachedAgent).toBe(agent);
    expect(weatherToolsFactory.create).toHaveBeenCalledTimes(1);
    expect((agent as unknown as { tools: unknown[] }).tools).toEqual(tools);
  });

  it("将输入和新建 Agent 委托给统一流式服务", async () => {
    const output = (async function* () {
      yield "北京晴朗";
    })();
    const streamingService = { stream: vi.fn().mockReturnValue(output) };
    const service = new WeatherAgentService(
      streamingService as never,
      { create: vi.fn().mockReturnValue([]) } as never,
    );
    const input: AgentStreamInput = { history: [{ role: "user", content: "北京天气" }] };

    const chunks: string[] = [];
    for await (const chunk of service.stream(input)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["北京晴朗"]);
    expect(streamingService.stream).toHaveBeenCalledWith(expect.any(Agent), input);
  });
});
