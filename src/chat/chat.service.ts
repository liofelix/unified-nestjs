/**
 * 聊天业务服务。
 * 负责会话和消息的持久化、用户范围校验、软删除以及 Agent 回复的 SSE 事件编排。
 */
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { IsNull, Repository } from "typeorm";
import {
  MAX_AGENT_OUTPUT_LENGTH,
  type AgentHistoryMessage,
  type AgentMessageRole,
} from "../agents/agents.types";
import { AgentsRegistry } from "../agents/agents.registry";
import { PaginationResult } from "../common/types/pagination-result";
import { ChatMessageRole } from "./chat.constants";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { ListConversationsDto } from "./dto/list-conversations.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { UpdateConversationDto } from "./dto/update-conversation.dto";
import { ChatConversation } from "./entities/chat-conversation.entity";
import { ChatMessage } from "./entities/chat-message.entity";
import { ChatSseEvent } from "./chat.types";

/** 会话不存在或已软删除时的统一错误消息。 */
const CONVERSATION_NOT_FOUND_MESSAGE = "对话不存在或已删除";
/** Agent 执行失败且不宜暴露底层细节时的统一错误消息。 */
const AGENT_FAILED_MESSAGE = "Agent 暂时不可用";
/** Agent 没有产生有效文本时的错误消息。 */
const AGENT_EMPTY_RESPONSE_MESSAGE = "Agent 未返回有效内容";
/** 发送给 Agent 的最大历史消息条数。 */
const HISTORY_MESSAGE_LIMIT = 20;
/** 数据库中出现未声明消息角色时的内部错误消息。 */
const INVALID_CHAT_MESSAGE_ROLE_MESSAGE = "聊天消息角色数据不合法";
/** Agent 输出超过长度上限时的安全错误消息。 */
const AGENT_OUTPUT_TOO_LONG_MESSAGE = "Agent 输出超出允许长度";

/** 编排聊天会话、消息存储和 Agent 流式回复的服务。 */
@Injectable()
export class ChatService {
  /** 注入会话仓库、消息仓库和 Agent 注册表。 */
  constructor(
    @InjectRepository(ChatConversation)
    private readonly conversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    private readonly agentsRegistry: AgentsRegistry,
  ) {}

  /** 校验 Agent code 后创建当前用户的聊天会话。 */
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

  /** 按用户范围分页查询未删除会话，并支持项目和 Agent 筛选。 */
  async findAll(
    userId: string,
    query: ListConversationsDto,
  ): Promise<PaginationResult<ChatConversation>> {
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
      .skip((query.pageNo - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return { items, total, pageNo: query.pageNo, pageSize: query.pageSize };
  }

  /** 按会话 UUID 和创建者查询未删除会话，不存在时抛出 404。 */
  async findOne(id: string, userId: string): Promise<ChatConversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, createdBy: userId, deletedAt: IsNull() },
    });

    if (!conversation) {
      throw new NotFoundException(CONVERSATION_NOT_FOUND_MESSAGE);
    }

    return conversation;
  }

  /** 更新会话可变字段，并记录最近修改者。 */
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

  /** 在事务中软删除会话及其所有未删除消息。 */
  async remove(id: string, userId: string): Promise<void> {
    const conversation = await this.findOne(id, userId);
    const deletedAt = new Date();
    conversation.deletedAt = deletedAt;
    conversation.deletedBy = userId;

    // 会话和消息必须在同一事务中标记，避免产生部分删除状态。
    await this.conversationRepository.manager.transaction(async (manager) => {
      await manager.save(conversation);
      await manager.update(
        ChatMessage,
        { conversationId: id, deletedAt: IsNull() },
        { deletedAt, updatedBy: userId, deletedBy: userId },
      );
    });
  }

  /** 校验会话归属后按创建时间正序返回消息。 */
  async getMessages(id: string, userId: string): Promise<ChatMessage[]> {
    await this.findOne(id, userId);

    return this.messageRepository.find({
      where: { conversationId: id, deletedAt: IsNull() },
      order: { createdAt: "ASC", id: "ASC" },
    });
  }

  /**
   * 编排一次用户消息的 Agent 流式回复。
   * 先保存用户消息，再发送元信息和文本增量，完成后持久化助手消息；客户端中断时立即停止。
   */
  async *streamReply(
    id: string,
    userId: string,
    dto: SendMessageDto,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatSseEvent> {
    let conversation: ChatConversation;

    try {
      // 只有会话存在且其 Agent 已注册时，才开始写入用户消息。
      conversation = await this.findOne(id, userId);
      this.agentsRegistry.getOrThrow(conversation.agentCode);
    } catch (error) {
      yield this.errorEvent(error, "CHAT_REQUEST_FAILED");
      return;
    }

    const requestId = randomUUID();
    const assistantChunks: string[] = [];
    let assistantTextLength = 0;

    try {
      await this.messageRepository.save({
        conversationId: id,
        role: ChatMessageRole.USER,
        content: dto.message,
        createdBy: userId,
      });
      await this.touchConversation(id, userId);

      const history = await this.getRecentHistory(id);
      const agent = this.agentsRegistry.getOrThrow(conversation.agentCode);
      // 元信息事件让客户端在接收文本前获得请求和会话标识。
      yield {
        type: "meta",
        data: { requestId, conversationId: id, agentCode: conversation.agentCode },
      };

      for await (const text of agent.stream({ history, signal })) {
        if (signal?.aborted) {
          return;
        }

        assistantTextLength += text.length;
        if (assistantTextLength > MAX_AGENT_OUTPUT_LENGTH) {
          throw new BadRequestException(AGENT_OUTPUT_TOO_LONG_MESSAGE);
        }

        assistantChunks.push(text);
      }

      if (signal?.aborted) {
        return;
      }

      const assistantText = assistantChunks.join("");

      if (!assistantText.trim()) {
        yield {
          type: "error",
          data: { code: "AGENT_EXECUTION_FAILED", message: AGENT_EMPTY_RESPONSE_MESSAGE },
        };
        return;
      }

      // Agent 流完成且安全检查通过后才开始发送增量，避免无法撤回的敏感片段泄露。
      for (const text of assistantChunks) {
        if (signal?.aborted) {
          return;
        }

        yield { type: "delta", data: { text } };
      }

      const assistantMessage = await this.messageRepository.save({
        conversationId: id,
        role: ChatMessageRole.ASSISTANT,
        content: assistantText,
        createdBy: userId,
      });
      await this.touchConversation(id, userId);
      yield { type: "done", data: { requestId, assistantMessageId: assistantMessage.id } };
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      yield this.errorEvent(error, "AGENT_EXECUTION_FAILED");
    }
  }

  /** 读取最近消息并反转为按时间正序的 Agent 历史格式。 */
  private async getRecentHistory(conversationId: string): Promise<AgentHistoryMessage[]> {
    const messages = await this.messageRepository.find({
      where: { conversationId, deletedAt: IsNull() },
      order: { createdAt: "DESC", id: "DESC" },
      take: HISTORY_MESSAGE_LIMIT,
    });

    return messages.reverse().map(({ role, content }) => ({
      role: this.toAgentMessageRole(role),
      content,
    }));
  }

  /** 将数据库数字消息角色转换为 Agent 使用的字符串角色。 */
  private toAgentMessageRole(role: ChatMessageRole): AgentMessageRole {
    if (role === ChatMessageRole.USER) {
      return "user";
    }

    if (role === ChatMessageRole.ASSISTANT) {
      return "assistant";
    }

    throw new InternalServerErrorException(INVALID_CHAT_MESSAGE_ROLE_MESSAGE);
  }

  /** 更新会话最近活动时间和修改者。 */
  private async touchConversation(conversationId: string, userId: string): Promise<void> {
    await this.conversationRepository.update(
      { id: conversationId, createdBy: userId, deletedAt: IsNull() },
      { updatedAt: new Date(), updatedBy: userId },
    );
  }

  /** 将 HTTP 异常保留为业务消息，其余 Agent 错误统一隐藏底层细节。 */
  private errorEvent(error: unknown, code: string): ChatSseEvent {
    let message = AGENT_FAILED_MESSAGE;
    if (error instanceof HttpException) {
      message = error.message;
    } else if (error instanceof Error && error.message === AGENT_EMPTY_RESPONSE_MESSAGE) {
      message = error.message;
    }

    return { type: "error", data: { code, message } };
  }
}
