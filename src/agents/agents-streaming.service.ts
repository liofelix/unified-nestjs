/**
 * Agent 的统一流式执行入口。
 * 负责把会话历史转换为模型输入、启动 OpenAI Agent 流、转发文本片段，
 * 并将输入或输出安全校验触发的底层异常转换为业务层可识别的 HTTP 错误。
 */
import { BadRequestException, Injectable } from "@nestjs/common";
import { Agent, assistant, type AgentInputItem, user } from "@openai/agents";
import { AgentsRunnerFactory } from "./agents-runner.factory";
import { MAX_AGENT_OUTPUT_LENGTH, type AgentStreamInput } from "./agents.types";

/** 单次对话允许的最大工具或 Agent 调用轮数。 */
const MAX_AGENT_TURNS = 6;

/** 安全校验触发时对客户端隐藏底层细节的统一错误消息。 */
const AGENT_GUARDRAIL_REJECTED_MESSAGE = "请求未通过 Agent 安全校验，请调整后重试。";
/** Agent 输出超过长度上限时对客户端返回的安全错误消息。 */
const AGENT_OUTPUT_TOO_LONG_MESSAGE = "Agent 输出超出允许长度";

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
   * 会话历史会转换为保留角色边界的结构化消息；执行最多允许 6 轮工具或 Agent 调用，
   * 文本会先在有界缓冲区中收集，只有完成事件和输出 guardrail 都通过后才 yield。
   */
  async *stream(agent: Agent, input: AgentStreamInput): AsyncGenerator<string> {
    try {
      const stream = await this.agentsRunnerFactory
        .createRunner()
        .run(agent, this.toAgentInput(input), {
          maxTurns: MAX_AGENT_TURNS,
          signal: input.signal,
          stream: true,
        });
      const textStream = stream.toTextStream({ compatibleWithNodeStreams: true });
      const chunks: string[] = [];
      let outputLength = 0;

      for await (const chunk of textStream) {
        if (input.signal?.aborted) {
          return;
        }

        const text = typeof chunk === "string" ? chunk : chunk.toString();

        if (text) {
          outputLength += text.length;
          if (outputLength > MAX_AGENT_OUTPUT_LENGTH) {
            throw new BadRequestException(AGENT_OUTPUT_TOO_LONG_MESSAGE);
          }

          chunks.push(text);
        }
      }

      await stream.completed;

      if (input.signal?.aborted) {
        return;
      }

      yield* chunks;
    } catch (error) {
      if (this.isGuardrailTripwire(error)) {
        throw new BadRequestException(AGENT_GUARDRAIL_REJECTED_MESSAGE);
      }

      throw error;
    }
  }

  /** 将持久化会话历史转换为 SDK 原生的结构化消息，避免文本角色标记被内容伪造。 */
  private toAgentInput(input: AgentStreamInput): AgentInputItem[] {
    return input.history.map((item) =>
      item.role === "user" ? user(item.content) : assistant(item.content),
    );
  }

  /** 判断异常是否属于输入或输出 guardrail 触发。 */
  private isGuardrailTripwire(error: unknown): boolean {
    return error instanceof Error && GUARDRAIL_TRIPWIRE_ERROR_NAMES.has(error.name);
  }
}
