/**
 * Agent 注册表单元测试。
 * 验证列表副本、未知 code 和重复注册保护。
 */
import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { ChatAgent } from "./agents.types";
import { AgentsRegistry } from "./agents.registry";

const weatherAgent: ChatAgent = {
  metadata: { code: "weather", name: "天气助手", description: "查询天气" },
  async *stream() {
    yield "晴朗";
  },
};

describe("AgentsRegistry", () => {
  it("返回元数据副本并按 code 获取 Agent", () => {
    const registry = new AgentsRegistry([weatherAgent]);
    const metadata = registry.list();

    expect(metadata).toEqual([weatherAgent.metadata]);
    expect(metadata[0]).not.toBe(weatherAgent.metadata);
    expect(registry.getOrThrow("weather")).toBe(weatherAgent);
  });

  it("未知 Agent 返回 404", () => {
    const registry = new AgentsRegistry([weatherAgent]);

    expect(() => registry.getOrThrow("unknown")).toThrow(NotFoundException);
  });

  it("拒绝重复 Agent code", () => {
    expect(() => new AgentsRegistry([weatherAgent, weatherAgent])).toThrow("重复的 Agent code");
  });
});
