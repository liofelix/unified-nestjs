export type ChatMessageRole = "user" | "assistant";

export interface AgentMetadata {
  code: string;
  name: string;
  description: string;
}

export interface AgentHistoryMessage {
  role: ChatMessageRole;
  content: string;
}

export interface AgentStreamInput {
  history: AgentHistoryMessage[];
  signal?: AbortSignal;
}

export interface ChatAgent {
  readonly metadata: AgentMetadata;

  stream(input: AgentStreamInput): AsyncIterable<string>;
}

export const CHAT_AGENT_PROVIDERS = Symbol("CHAT_AGENT_PROVIDERS");
