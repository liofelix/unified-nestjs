/**
 * Agent 目录控制器单元测试。
 * 验证目录接口委托注册表返回可用 Agent 元数据。
 */
import { describe, expect, it, vi } from "vitest";
import { AgentsController } from "./agents.controller";

describe("AgentsController", () => {
  it("返回 Agent 注册目录", () => {
    const agentsRegistry = { list: vi.fn().mockReturnValue([{ code: "weather" }]) };

    expect(new AgentsController(agentsRegistry as never).list()).toEqual([{ code: "weather" }]);
    expect(agentsRegistry.list).toHaveBeenCalledTimes(1);
  });
});
