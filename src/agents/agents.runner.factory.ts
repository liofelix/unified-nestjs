import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OpenAIProvider, Runner } from "@openai/agents";

type AgentApiMode = "chat_completions" | "responses";

const AGENT_NOT_CONFIGURED_MESSAGE = "Agent 模型服务尚未配置";
const AGENT_INVALID_MODE_MESSAGE = "AGENT_LLM_API_MODE 仅支持 chat_completions 或 responses";

@Injectable()
export class AgentsRunnerFactory {
  constructor(private readonly configService: ConfigService) {}

  createRunner(): Runner {
    const apiKey = this.configService.get<string>("AGENT_LLM_API_KEY")?.trim();
    const model = this.configService.get<string>("AGENT_LLM_MODEL")?.trim();

    if (!apiKey || !model) {
      throw new ServiceUnavailableException(AGENT_NOT_CONFIGURED_MESSAGE);
    }

    const apiMode = this.getApiMode();
    const baseURL = this.configService.get<string>("AGENT_LLM_BASE_URL")?.trim() || undefined;
    const tracingEnabled = this.configService.get<string>("AGENT_TRACING_ENABLED") === "true";

    return new Runner({
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
  }

  private getApiMode(): AgentApiMode {
    const apiMode = this.configService.get<string>("AGENT_LLM_API_MODE") ?? "chat_completions";

    if (apiMode === "chat_completions" || apiMode === "responses") {
      return apiMode;
    }

    throw new ServiceUnavailableException(AGENT_INVALID_MODE_MESSAGE);
  }
}
