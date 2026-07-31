/**
 * 聊天消息持久化实体。
 * 保存用户或助手消息正文、所属会话及审计字段，并支持按时间线查询未删除消息。
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ChatConversation } from "./chat-conversation.entity";

/** 支持读取单个对话中未删除的消息，并按创建时间排序。 */
@Index("IDX_chat_messages_conversation_timeline", ["conversationId", "deletedAt", "createdAt"])
/** 会话消息实体，映射 chat_messages 表并关联所属会话。 */
@Entity("chat_messages")
export class ChatMessage {
  /** 消息 UUID 主键。 */
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** 所属会话 UUID。 */
  @Column({ name: "conversation_id", type: "uuid" })
  conversationId!: string;

  /** 当前消息所属的会话实体。 */
  @ManyToOne(() => ChatConversation, (conversation) => conversation.messages, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "conversation_id" })
  conversation!: ChatConversation;

  /** 消息角色，仅允许用户或助手。 */
  @Column({ type: "varchar", length: 20 })
  role!: "user" | "assistant";

  /** 消息正文。 */
  @Column({ type: "text" })
  content!: string;

  /** 消息创建时间。 */
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  /** 创建该消息的用户 UUID。 */
  @Column({ name: "created_by", type: "uuid" })
  createdBy!: string;

  /** 最近一次修改时间。 */
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  /** 最近修改者用户 UUID。 */
  @Column({ name: "updated_by", type: "uuid", nullable: true })
  updatedBy: string | null = null;

  /** 软删除时间；未删除时为空。 */
  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null = null;

  /** 执行软删除的用户 UUID。 */
  @Column({ name: "deleted_by", type: "uuid", nullable: true })
  deletedBy: string | null = null;
}
