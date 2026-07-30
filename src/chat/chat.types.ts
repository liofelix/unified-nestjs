import { ChatMessageRole } from "../agents/agents.types";

export interface ChatSseEvent {
  type: "meta" | "delta" | "done" | "error";
  data: Record<string, string>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type PersistedChatRole = ChatMessageRole;
