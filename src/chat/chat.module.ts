/**
 * 聊天模块。
 * 注册会话和消息实体、聊天控制器与服务，并依赖 Agent 注册表执行对话。
 */
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AgentsModule } from "../agents/agents.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ChatConversation } from "./entities/chat-conversation.entity";
import { ChatMessage } from "./entities/chat-message.entity";

/** 对话与消息领域的 NestJS 模块。 */
@Module({
  imports: [TypeOrmModule.forFeature([ChatConversation, ChatMessage]), AgentsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
