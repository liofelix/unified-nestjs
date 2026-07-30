import { HttpException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { IsNull, Repository } from "typeorm";
import { AgentHistoryMessage } from "../agents/agents.types";
import { AgentsRegistry } from "../agents/agents.registry";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { ListConversationsDto } from "./dto/list-conversations.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { UpdateConversationDto } from "./dto/update-conversation.dto";
import { ChatConversation } from "./entities/chat-conversation.entity";
import { ChatMessage } from "./entities/chat-message.entity";
import { ChatSseEvent, PaginatedResult } from "./chat.types";

const CONVERSATION_NOT_FOUND_MESSAGE = "对话不存在或已删除";
const AGENT_FAILED_MESSAGE = "Agent 暂时不可用";
const AGENT_EMPTY_RESPONSE_MESSAGE = "Agent 未返回有效内容";
const HISTORY_MESSAGE_LIMIT = 20;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatConversation)
    private readonly conversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    private readonly agentsRegistry: AgentsRegistry,
  ) {}

  async create(userId: string, dto: CreateConversationDto): Promise<ChatConversation> {
    this.agentsRegistry.getOrThrow(dto.agentCode);

    return this.conversationRepository.save(
      this.conversationRepository.create({
        createdBy: userId,
        agentCode: dto.agentCode,
        projectId: dto.projectId ?? null,
        title: dto.title ?? "新对话",
      }),
    );
  }

  async findAll(
    userId: string,
    query: ListConversationsDto,
  ): Promise<PaginatedResult<ChatConversation>> {
    const builder = this.conversationRepository
      .createQueryBuilder("conversation")
      .where("conversation.created_by = :userId", { userId })
      .andWhere("conversation.deleted_at IS NULL");

    if (query.projectId) {
      builder.andWhere("conversation.project_id = :projectId", { projectId: query.projectId });
    }

    if (query.agentCode) {
      builder.andWhere("conversation.agent_code = :agentCode", { agentCode: query.agentCode });
    }

    const [items, total] = await builder
      .orderBy("conversation.updated_at", "DESC")
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string, userId: string): Promise<ChatConversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, createdBy: userId, deletedAt: IsNull() },
    });

    if (!conversation) {
      throw new NotFoundException(CONVERSATION_NOT_FOUND_MESSAGE);
    }

    return conversation;
  }

  async update(id: string, userId: string, dto: UpdateConversationDto): Promise<ChatConversation> {
    const conversation = await this.findOne(id, userId);

    if (dto.title !== undefined) {
      conversation.title = dto.title;
    }

    if (dto.projectId !== undefined) {
      conversation.projectId = dto.projectId;
    }

    conversation.updatedBy = userId;

    return this.conversationRepository.save(conversation);
  }

  async remove(id: string, userId: string): Promise<void> {
    const conversation = await this.findOne(id, userId);
    const deletedAt = new Date();
    conversation.deletedAt = deletedAt;
    conversation.deletedBy = userId;

    await this.conversationRepository.manager.transaction(async (manager) => {
      await manager.save(conversation);
      await manager.update(
        ChatMessage,
        { conversationId: id, deletedAt: IsNull() },
        { deletedAt, updatedBy: userId, deletedBy: userId },
      );
    });
  }

  async getMessages(id: string, userId: string): Promise<ChatMessage[]> {
    await this.findOne(id, userId);

    return this.messageRepository.find({
      where: { conversationId: id, deletedAt: IsNull() },
      order: { createdAt: "ASC" },
    });
  }

  async *streamReply(
    id: string,
    userId: string,
    dto: SendMessageDto,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatSseEvent> {
    let conversation: ChatConversation;

    try {
      conversation = await this.findOne(id, userId);
      this.agentsRegistry.getOrThrow(conversation.agentCode);
    } catch (error) {
      yield this.errorEvent(error, "CHAT_REQUEST_FAILED");
      return;
    }

    const requestId = randomUUID();
    let assistantText = "";

    try {
      await this.messageRepository.save({
        conversationId: id,
        role: "user",
        content: dto.message,
        createdBy: userId,
      });
      await this.touchConversation(conversation, userId);

      const history = await this.getRecentHistory(id);
      const agent = this.agentsRegistry.getOrThrow(conversation.agentCode);
      yield {
        type: "meta",
        data: { requestId, conversationId: id, agentCode: conversation.agentCode },
      };

      for await (const text of agent.stream({ history, signal })) {
        if (signal?.aborted) {
          return;
        }

        assistantText += text;
        yield { type: "delta", data: { text } };
      }

      if (signal?.aborted) {
        return;
      }

      if (!assistantText.trim()) {
        yield {
          type: "error",
          data: { code: "AGENT_EXECUTION_FAILED", message: AGENT_EMPTY_RESPONSE_MESSAGE },
        };
        return;
      }

      const assistantMessage = await this.messageRepository.save({
        conversationId: id,
        role: "assistant",
        content: assistantText,
        createdBy: userId,
      });
      await this.touchConversation(conversation, userId);
      yield { type: "done", data: { requestId, assistantMessageId: assistantMessage.id } };
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      yield this.errorEvent(error, "AGENT_EXECUTION_FAILED");
    }
  }

  private async getRecentHistory(conversationId: string): Promise<AgentHistoryMessage[]> {
    const messages = await this.messageRepository.find({
      where: { conversationId, deletedAt: IsNull() },
      order: { createdAt: "DESC" },
      take: HISTORY_MESSAGE_LIMIT,
    });

    return messages.reverse().map(({ role, content }) => ({ role, content }));
  }

  private async touchConversation(conversation: ChatConversation, userId: string): Promise<void> {
    conversation.updatedAt = new Date();
    conversation.updatedBy = userId;
    await this.conversationRepository.save(conversation);
  }

  private errorEvent(error: unknown, code: string): ChatSseEvent {
    const message =
      error instanceof HttpException
        ? error.message
        : error instanceof Error && error.message === AGENT_EMPTY_RESPONSE_MESSAGE
          ? error.message
          : AGENT_FAILED_MESSAGE;

    return { type: "error", data: { code, message } };
  }
}
