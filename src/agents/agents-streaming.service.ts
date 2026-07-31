/**
 * Agent 的统一流式执行入口。
 * 负责把会话历史转换为模型输入、启动 OpenAI Agent 流、转发文本片段，
 * 并将输入或输出安全校验触发的底层异常转换为业务层可识别的 HTTP 错误。
 */
import { BadRequestException, Injectable } from "@nestjs/common";
import { Agent } from "@openai/agents";
import { AgentsRunnerFactory } from "./agents-runner.factory";
import { AgentStreamInput } from "./agents.types";

/** 安全校验触发时对客户端隐藏底层细节的统一错误消息。 */
const AGENT_GUARDRAIL_REJECTED_MESSAGE = "请求未通过 Agent 安全校验，请调整后重试。";

/** OpenAI Agents SDK 在输入或输出 guardrail 触发时使用的错误名称。 */
const GUARDRAIL_TRIPWIRE_ERROR_NAMES = new Set([
  "InputGuardrailTripwireTriggered",
  "OutputGuardrailTripwireTriggered",
]);

/**
 * 统一执行 Agent 对话并以异步迭代器输出文本片段。
 * Agent 实例由具体领域服务创建，Runner 和流式协议由本服务集中管理。
 */
@Injectable()
export class AgentsStreamingService {
  /** 注入 Runner 工厂，以便使用当前环境配置创建模型执行器。 */
  constructor(private readonly agentsRunnerFactory: AgentsRunnerFactory) {}

  /**
   * 启动一次流式 Agent 对话。
   *
   * 会话历史会先转换为带角色标记的文本；执行最多允许 6 轮工具或 Agent 调用，
   * 中途产生的非空文本会立即 yield，完成事件则在流结束前等待确认。
   */
  async *stream(agent: Agent, input: AgentStreamInput): AsyncGenerator<string> {
    try {
      const stream = await this.agentsRunnerFactory
        .createRunner()
        .run(agent, this.toAgentInput(input), {
          maxTurns: 6,
          signal: input.signal,
          stream: true,
        });
      const textStream = stream.toTextStream({ compatibleWithNodeStreams: true });

      for await (const chunk of textStream) {
        const text = typeof chunk === "string" ? chunk : chunk.toString();

        if (text) {
          yield text;
        }
      }

      await stream.completed;
    } catch (error) {
      if (this.isGuardrailTripwire(error)) {
        throw new BadRequestException(AGENT_GUARDRAIL_REJECTED_MESSAGE);
      }

      throw error;
    }
  }

  /** 将结构化会话历史转换成模型可读的中文对话文本。 */
  private toAgentInput(input: AgentStreamInput): string {
    const conversation = input.history
      .map((item) => `${item.role === "user" ? "用户" : "助手"}：${item.content}`)
      .join("\n");

    return `以下是当前会话记录：\n${conversation}`;
  }

  /** 判断异常是否属于输入或输出 guardrail 触发。 */
  private isGuardrailTripwire(error: unknown): boolean {
    return error instanceof Error && GUARDRAIL_TRIPWIRE_ERROR_NAMES.has(error.name);
  }
}
