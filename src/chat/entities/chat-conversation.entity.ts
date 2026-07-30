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
@Entity("chat_conversations")
export class ChatConversation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "agent_code", type: "varchar", length: 50 })
  agentCode!: string;

  @Column({ name: "project_id", type: "uuid", nullable: true })
  projectId: string | null = null;

  @Column({ type: "varchar", length: 200, default: "新对话" })
  title = "新对话";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "created_by", type: "uuid" })
  createdBy!: string;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @Column({ name: "updated_by", type: "uuid", nullable: true })
  updatedBy: string | null = null;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null = null;

  @Column({ name: "deleted_by", type: "uuid", nullable: true })
  deletedBy: string | null = null;

  @OneToMany(() => ChatMessage, (message) => message.conversation)
  messages!: ChatMessage[];
}
