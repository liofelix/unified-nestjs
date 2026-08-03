/**
 * 聊天消息持久化常量。
 * 数据库和聊天消息接口使用数字区分用户消息与助手消息。
 */

/** 聊天消息角色的稳定数字编码。 */
export enum ChatMessageRole {
  /** 用户发送的消息。 */
  USER = 1,
  /** Agent 生成的助手消息。 */
  ASSISTANT = 2,
}

/** 聊天消息角色允许的数字集合。 */
export const CHAT_MESSAGE_ROLES = [ChatMessageRole.USER, ChatMessageRole.ASSISTANT] as const;
