/**
 * Agent 模块共享的类型契约。
 * 这些类型连接聊天历史、Agent 注册表和流式执行服务，不包含具体领域实现。
 */

/** 聊天历史中允许出现的消息角色。 */
export type ChatMessageRole = "user" | "assistant";

/** Agent 对外展示和注册所需的稳定元数据。 */
export interface AgentMetadata {
  /** 用于请求路由和注册表索引的唯一 code。 */
  code: string;
  /** 面向用户展示的 Agent 名称。 */
  name: string;
  /** 对 Agent 能力范围的简短说明。 */
  description: string;
}

/** 一条已经按角色标记的历史聊天消息。 */
export interface AgentHistoryMessage {
  /** 消息来自用户还是 Agent。 */
  role: ChatMessageRole;
  /** 消息正文。 */
  content: string;
}

/** 启动一次 Agent 流式对话所需的输入。 */
export interface AgentStreamInput {
  /** 按时间顺序排列的当前会话历史。 */
  history: AgentHistoryMessage[];
  /** 可选的取消信号，用于中止底层模型请求。 */
  signal?: AbortSignal;
}

/** 领域 Agent 必须实现的最小运行契约。 */
export interface ChatAgent {
  /** 注册表和展示接口使用的 Agent 元数据。 */
  readonly metadata: AgentMetadata;

  /** 根据会话输入生成文本片段流。 */
  stream(input: AgentStreamInput): AsyncIterable<string>;
}

/** NestJS 注入多个 ChatAgent 实例时使用的 Provider Token。 */
export const CHAT_AGENT_PROVIDERS = Symbol("CHAT_AGENT_PROVIDERS");
