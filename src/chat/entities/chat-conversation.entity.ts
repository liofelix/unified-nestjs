/**
 * 聊天会话持久化实体。
 * 记录 Agent、项目空间、标题和审计信息，并通过软删除保留历史数据。
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ChatMessage } from "./chat-message.entity";

/** 支持按创建者查询未删除的会话，并按最近更新时间排序。 */
@Index("IDX_chat_conversations_owner_recent", ["createdBy", "deletedAt", "updatedAt"])
/** 支持按创建者和项目查询未删除的会话，并按最近更新时间排序。 */
@Index("IDX_chat_conversations_owner_project_recent", [
  "createdBy",
  "projectId",
  "deletedAt",
  "updatedAt",
])
/** 支持按创建者和 Agent 查询未删除的会话，并按最近更新时间排序。 */
@Index("IDX_chat_conversations_owner_agent_recent", [
  "createdBy",
  "agentCode",
  "deletedAt",
  "updatedAt",
])
/** 会话实体，映射 chat_conversations 表并维护消息一对多关系。 */
@Entity("chat_conversations")
export class ChatConversation {
  /** 会话 UUID 主键。 */
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** 负责处理该会话消息的 Agent code。 */
  @Column({ name: "agent_code", type: "varchar", length: 50 })
  agentCode!: string;

  /** 可选项目空间 UUID。 */
  @Column({ name: "project_id", type: "uuid", nullable: true })
  projectId: string | null = null;

  /** 会话展示标题。 */
  @Column({ type: "varchar", length: 200, default: "新对话" })
  title = "新对话";

  /** 会话创建时间。 */
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  /** 创建该会话的用户 UUID。 */
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

  /** 该会话关联的消息集合。 */
  @OneToMany(() => ChatMessage, (message) => message.conversation)
  messages!: ChatMessage[];
}
