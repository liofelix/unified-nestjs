import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AgentMetadata, ChatAgent, CHAT_AGENT_PROVIDERS } from "./agents.types";

const AGENT_NOT_FOUND_MESSAGE = "Agent 不存在或不可用";

@Injectable()
export class AgentsRegistry {
  private readonly agentsByCode: Map<string, ChatAgent>;

  constructor(@Inject(CHAT_AGENT_PROVIDERS) agents: ChatAgent[]) {
    this.agentsByCode = new Map();

    for (const agent of agents) {
      if (this.agentsByCode.has(agent.metadata.code)) {
        throw new Error(`重复的 Agent code: ${agent.metadata.code}`);
      }

      this.agentsByCode.set(agent.metadata.code, agent);
    }
  }

  list(): AgentMetadata[] {
    return [...this.agentsByCode.values()].map(({ metadata }) => ({ ...metadata }));
  }

  getOrThrow(code: string): ChatAgent {
    const agent = this.agentsByCode.get(code);

    if (!agent) {
      throw new NotFoundException(AGENT_NOT_FOUND_MESSAGE);
    }

    return agent;
  }
}
