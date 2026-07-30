import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AgentsModule } from "../agents/agents.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ChatConversation } from "./entities/chat-conversation.entity";
import { ChatMessage } from "./entities/chat-message.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ChatConversation, ChatMessage]), AgentsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
