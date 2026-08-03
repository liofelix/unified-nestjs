/**
 * Agent 实例注册表。
 * 在应用启动时按稳定 code 建立索引，供列表接口展示和聊天服务按 code 获取实例。
 */
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AgentMetadata, ChatAgent, CHAT_AGENT_PROVIDERS } from "./agents.types";

/** 按 code 查找不到 Agent 时返回给客户端的统一错误消息。 */
const AGENT_NOT_FOUND_MESSAGE = "智能体不存在或不可用";

/** 管理已注册 ChatAgent 的索引和查询。 */
@Injectable()
export class AgentsRegistry {
  /** 以 Agent metadata.code 为键的运行时实例索引。 */
  private readonly agentsByCode: Map<string, ChatAgent>;

  /**
   * 接收模块注入的全部 Agent 并建立索引。
   * code 必须唯一，重复注册会在启动阶段直接失败，避免请求路由到不确定的实例。
   */
  constructor(@Inject(CHAT_AGENT_PROVIDERS) agents: ChatAgent[]) {
    this.agentsByCode = new Map();

    for (const agent of agents) {
      if (this.agentsByCode.has(agent.metadata.code)) {
        throw new Error(`重复的 Agent code: ${agent.metadata.code}`);
      }

      this.agentsByCode.set(agent.metadata.code, agent);
    }
  }

  /** 返回所有 Agent 的元数据副本，不暴露内部实例或可变引用。 */
  list(): AgentMetadata[] {
    return [...this.agentsByCode.values()].map(({ metadata }) => ({ ...metadata }));
  }

  /** 按 code 获取 Agent；找不到时抛出 NestJS 404 异常。 */
  getOrThrow(code: string): ChatAgent {
    const agent = this.agentsByCode.get(code);

    if (!agent) {
      throw new NotFoundException(AGENT_NOT_FOUND_MESSAGE);
    }

    return agent;
  }
}
