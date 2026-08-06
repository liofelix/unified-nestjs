/**
 * Agent 输出 Guardrail 单元测试。
 * 覆盖密钥、Bearer 凭证、运行时错误和安全文本分支。
 */
import { describe, expect, it } from "vitest";
import {
  AGENT_OUTPUT_SAFETY_GUARDRAIL,
  containsSensitiveAgentOutput,
} from "./agent-output.guardrail";

describe("agent output guardrail", () => {
  it("识别常见敏感输出", () => {
    expect(containsSensitiveAgentOutput("sk-abcdefghijklmnop")).toBe(true);
    expect(containsSensitiveAgentOutput("authorization: Bearer eyJhbGciOiJIUzI1NiJ9")).toBe(true);
    expect(containsSensitiveAgentOutput("TypeError: internal failure")).toBe(true);
    expect(containsSensitiveAgentOutput("北京今天晴朗")).toBe(false);
  });

  it("返回结构化 guardrail 结果", async () => {
    await expect(
      AGENT_OUTPUT_SAFETY_GUARDRAIL.execute({ agentOutput: "AGENT_LLM_API_KEY=secret" } as never),
    ).resolves.toEqual({ tripwireTriggered: true, outputInfo: { containsSensitiveOutput: true } });
    await expect(
      AGENT_OUTPUT_SAFETY_GUARDRAIL.execute({ agentOutput: { text: "安全" } } as never),
    ).resolves.toEqual({
      tripwireTriggered: false,
      outputInfo: { containsSensitiveOutput: false },
    });
  });
});
