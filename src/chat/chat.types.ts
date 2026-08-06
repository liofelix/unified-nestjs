/**
 * 聊天模块共享类型。
 * 连接 HTTP/SSE 控制器、会话服务、持久化实体和 Agent 历史消息。
 */
/** 聊天 SSE 接口向客户端发送的事件结构。 */
export interface ChatSseEvent {
  /** 事件类型：元信息、文本增量、完成或错误。 */
  type: "meta" | "delta" | "done" | "error";
  /** 事件负载，字段由事件类型决定。 */
  data: Record<string, string>;
}
