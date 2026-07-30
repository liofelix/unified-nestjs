import { BadRequestException, Injectable } from "@nestjs/common";
import { Agent } from "@openai/agents";
import { AgentsRunnerFactory } from "./agents.runner.factory";
import { AgentStreamInput } from "./agents.types";

const AGENT_GUARDRAIL_REJECTED_MESSAGE = "请求未通过 Agent 安全校验，请调整后重试。";
const GUARDRAIL_TRIPWIRE_ERROR_NAMES = new Set([
  "InputGuardrailTripwireTriggered",
  "OutputGuardrailTripwireTriggered",
]);

@Injectable()
export class AgentsStreamingService {
  constructor(private readonly agentsRunnerFactory: AgentsRunnerFactory) {}

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

  private toAgentInput(input: AgentStreamInput): string {
    const conversation = input.history
      .map((item) => `${item.role === "user" ? "用户" : "助手"}：${item.content}`)
      .join("\n");

    return `以下是当前会话记录：\n${conversation}`;
  }

  private isGuardrailTripwire(error: unknown): boolean {
    return error instanceof Error && GUARDRAIL_TRIPWIRE_ERROR_NAMES.has(error.name);
  }
}
