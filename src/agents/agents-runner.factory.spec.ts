/**
 * Agent Runner 工厂单元测试。
 * 使用假的 SDK Provider 和 Runner 验证配置校验、API 模式与 tracing 参数。
 */
import { vi } from "vitest";

const sdk = vi.hoisted(() => {
  const providerOptions: Array<Record<string, unknown>> = [];
  const runnerOptions: Array<Record<string, unknown>> = [];
  class FakeOpenAIProvider {
    constructor(options: Record<string, unknown>) {
      providerOptions.push(options);
    }
  }
  class FakeRunner {
    constructor(options: Record<string, unknown>) {
      runnerOptions.push(options);
    }
  }

  return { FakeOpenAIProvider, FakeRunner, providerOptions, runnerOptions };
});

vi.mock("@openai/agents", () => ({
  OpenAIProvider: sdk.FakeOpenAIProvider,
  Runner: sdk.FakeRunner,
}));

import { ServiceUnavailableException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";
import { AgentsRunnerFactory } from "./agents-runner.factory";

function createConfig(values: Record<string, string | undefined>) {
  return {
    get: <T>(key: string) => values[key] as T | undefined,
  } as unknown as ConfigService;
}

describe("AgentsRunnerFactory", () => {
  it("缺少 API key 或模型时返回服务不可用", () => {
    const service = new AgentsRunnerFactory(createConfig({}));

    expect(() => service.createRunner()).toThrow(ServiceUnavailableException);
  });

  it("拒绝未知 API 模式", () => {
    const service = new AgentsRunnerFactory(
      createConfig({
        AGENT_LLM_API_KEY: "key",
        AGENT_LLM_MODEL: "model",
        AGENT_LLM_API_MODE: "unknown",
      }),
    );

    expect(() => service.createRunner()).toThrow("AGENT_LLM_API_MODE");
  });

  it("按 chat_completions 默认模式创建安全 Runner", () => {
    sdk.providerOptions.length = 0;
    sdk.runnerOptions.length = 0;
    const service = new AgentsRunnerFactory(
      createConfig({
        AGENT_LLM_API_KEY: " key ",
        AGENT_LLM_MODEL: " model ",
        AGENT_LLM_BASE_URL: " https://llm.test ",
        AGENT_TRACING_ENABLED: "false",
      }),
    );

    const firstRunner = service.createRunner();
    const secondRunner = service.createRunner();

    expect(sdk.providerOptions[0]).toMatchObject({
      apiKey: "key",
      baseURL: "https://llm.test",
      strictFeatureValidation: true,
      useResponses: false,
    });
    expect(sdk.runnerOptions[0]).toMatchObject({
      model: "model",
      tracingDisabled: true,
      traceIncludeSensitiveData: false,
    });
    expect(secondRunner).toBe(firstRunner);
    expect(sdk.runnerOptions).toHaveLength(1);
  });

  it("支持 Responses 模式和显式 tracing", () => {
    sdk.providerOptions.length = 0;
    sdk.runnerOptions.length = 0;
    const service = new AgentsRunnerFactory(
      createConfig({
        AGENT_LLM_API_KEY: "key",
        AGENT_LLM_MODEL: "model",
        AGENT_LLM_API_MODE: "responses",
        AGENT_TRACING_ENABLED: "true",
      }),
    );

    service.createRunner();

    expect(sdk.providerOptions[0]).toMatchObject({ useResponses: true, baseURL: undefined });
    expect(sdk.runnerOptions[0]).toMatchObject({ tracingDisabled: false });
  });
});
