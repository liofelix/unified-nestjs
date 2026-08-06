/**
 * 模型 Runner 工厂。
 * 从配置服务读取 Agent 模型连接信息，并为每次对话创建带有正确 API 模式、
 * tracing 设置和敏感数据策略的 OpenAI Agents Runner。
 */
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OpenAIProvider, Runner } from "@openai/agents";

/** 当前支持的 OpenAI Agents API 调用模式。 */
type AgentApiMode = "chat_completions" | "responses";

/** API Key 或模型名称缺失时的服务不可用消息。 */
const AGENT_NOT_CONFIGURED_MESSAGE = "Agent 模型服务尚未配置";

/** API 模式配置不在允许枚举内时的服务不可用消息。 */
const AGENT_INVALID_MODE_MESSAGE = "AGENT_LLM_API_MODE 仅支持 chat_completions 或 responses";

/** 根据运行环境配置创建模型 Runner。 */
@Injectable()
export class AgentsRunnerFactory {
  /** 注入统一配置服务，读取 Agent 专用环境变量。 */
  constructor(private readonly configService: ConfigService) {}

  /** 已按当前配置创建并可跨请求复用的 Runner。 */
  private runner?: Runner;

  /**
   * 创建一次 Agent 运行器。
   * 连接配置不完整或 API 模式非法时立即抛出服务不可用异常；tracing 默认关闭，
   * 且始终禁止把敏感数据写入 trace。
   */
  createRunner(): Runner {
    if (this.runner) {
      return this.runner;
    }

    const apiKey = this.configService.get<string>("AGENT_LLM_API_KEY")?.trim();
    const model = this.configService.get<string>("AGENT_LLM_MODEL")?.trim();

    if (!apiKey || !model) {
      throw new ServiceUnavailableException(AGENT_NOT_CONFIGURED_MESSAGE);
    }

    const apiMode = this.getApiMode();
    // Base URL 为空时交给 SDK 使用默认服务地址。
    const baseURL = this.configService.get<string>("AGENT_LLM_BASE_URL")?.trim() || undefined;
    // 只有显式配置为字符串 true 才启用 tracing。
    const tracingEnabled = this.configService.get<string>("AGENT_TRACING_ENABLED") === "true";

    this.runner = new Runner({
      model,
      modelProvider: new OpenAIProvider({
        apiKey,
        baseURL,
        strictFeatureValidation: true,
        useResponses: apiMode === "responses",
      }),
      tracingDisabled: !tracingEnabled,
      traceIncludeSensitiveData: false,
    });

    return this.runner;
  }

  /** 读取并校验模型 API 模式，未配置时默认使用 Chat Completions。 */
  private getApiMode(): AgentApiMode {
    const apiMode = this.configService.get<string>("AGENT_LLM_API_MODE") ?? "chat_completions";

    if (apiMode === "chat_completions" || apiMode === "responses") {
      return apiMode;
    }

    throw new ServiceUnavailableException(AGENT_INVALID_MODE_MESSAGE);
  }
}
