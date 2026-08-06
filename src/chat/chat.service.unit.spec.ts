/**
 * 聊天服务单元测试。
 * 使用内存会话/消息仓库验证用户隔离、分页、软删除和 Agent SSE 编排。
 */
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ChatMessageRole } from "./chat.constants";
import { ChatConversation } from "./entities/chat-conversation.entity";
import { ChatMessage } from "./entities/chat-message.entity";
import { ChatService } from "./chat.service";
import type { ChatSseEvent } from "./chat.types";

const CONVERSATION_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const USER_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

function createConversation(overrides: Partial<ChatConversation> = {}) {
  return {
    id: CONVERSATION_ID,
    createdBy: USER_ID,
    agentCode: "weather",
    projectId: null,
    title: "新对话",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    messages: [],
    ...overrides,
  } as ChatConversation;
}

function createService(
  agent: { stream: (input: unknown) => AsyncIterable<string> } = {
    async *stream() {
      yield "晴朗";
    },
  },
  history: ChatMessage[] = [],
) {
  const conversation = createConversation();
  let messageNumber = 0;
  const conversationRepository = {
    create: vi.fn((input) => ({ ...conversation, ...input })),
    createQueryBuilder: vi.fn(),
    findOne: vi.fn().mockResolvedValue(conversation),
    manager: {
      transaction: vi.fn(async (callback: (manager: unknown) => unknown) =>
        callback({
          save: vi.fn().mockResolvedValue(conversation),
          update: vi.fn().mockResolvedValue(undefined),
        }),
      ),
    },
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    save: vi.fn().mockImplementation(async (value) => value),
  };
  const messageRepository = {
    find: vi.fn().mockResolvedValue(history),
    save: vi.fn().mockImplementation(async (value) => ({
      id: `message-${++messageNumber}`,
      createdAt: new Date(1_700_000_000_000 + messageNumber),
      ...value,
    })),
  };
  const agentsRegistry = {
    getOrThrow: vi.fn().mockReturnValue(agent),
  };
  const service = new ChatService(
    conversationRepository as never,
    messageRepository as never,
    agentsRegistry as never,
  );

  return { service, conversation, conversationRepository, messageRepository, agentsRegistry };
}

function createListBuilder(result: [unknown[], number]) {
  return {
    andWhere: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn().mockResolvedValue(result),
    orderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
}

describe("ChatService", () => {
  it("创建会话前校验 Agent 并使用默认标题", async () => {
    const { service, conversationRepository, agentsRegistry } = createService();

    await expect(service.create(USER_ID, { agentCode: "weather" })).resolves.toMatchObject({
      createdBy: USER_ID,
      agentCode: "weather",
      title: "新对话",
    });
    expect(agentsRegistry.getOrThrow).toHaveBeenCalledWith("weather");
    expect(conversationRepository.create).toHaveBeenCalledWith({
      createdBy: USER_ID,
      agentCode: "weather",
      projectId: null,
      title: "新对话",
    });
  });

  it("按用户范围分页并支持项目和 Agent 筛选", async () => {
    const { service, conversationRepository } = createService();
    const builder = createListBuilder([[createConversation()], 1]);
    conversationRepository.createQueryBuilder.mockReturnValue(builder);

    await expect(
      service.findAll(USER_ID, {
        pageNo: 2,
        pageSize: 10,
        projectId: "project-1",
        agentCode: "weather",
      }),
    ).resolves.toMatchObject({ total: 1, pageNo: 2, pageSize: 10 });
    expect(builder.where).toHaveBeenCalledWith("conversation.created_by = :userId", {
      userId: USER_ID,
    });
    expect(builder.andWhere).toHaveBeenCalledWith("conversation.project_id = :projectId", {
      projectId: "project-1",
    });
    expect(builder.andWhere).toHaveBeenCalledWith("conversation.agent_code = :agentCode", {
      agentCode: "weather",
    });
  });

  it("找不到会话时返回 404，并读取用户消息时间线", async () => {
    const { service, conversationRepository, messageRepository } = createService();
    conversationRepository.findOne.mockResolvedValueOnce(null);

    await expect(service.findOne(CONVERSATION_ID, USER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    conversationRepository.findOne.mockResolvedValueOnce(createConversation());
    messageRepository.find.mockResolvedValueOnce([{ id: "message-1" }]);
    await expect(service.getMessages(CONVERSATION_ID, USER_ID)).resolves.toEqual([
      { id: "message-1" },
    ]);
    expect(messageRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ conversationId: CONVERSATION_ID }),
        order: { createdAt: "ASC", id: "ASC" },
      }),
    );
  });

  it("在事务中软删除会话及其消息", async () => {
    const { service, conversation, conversationRepository } = createService();

    await service.remove(CONVERSATION_ID, USER_ID);

    expect(conversation.deletedBy).toBe(USER_ID);
    expect(conversation.deletedAt).toBeInstanceOf(Date);
    const transaction = conversationRepository.manager.transaction.mock.calls[0]?.[0];
    expect(transaction).toBeTypeOf("function");
  });

  it("成功流式回复时发送 meta、delta、done 并保存助手消息", async () => {
    const receivedHistory: unknown[] = [];
    const history = Array.from({ length: 20 }, (_, index) => ({
      id: `old-${index}`,
      conversationId: CONVERSATION_ID,
      role: index % 2 === 0 ? ChatMessageRole.USER : ChatMessageRole.ASSISTANT,
      content: `历史-${index}`,
      createdAt: new Date(1_700_000_000_000 + index),
    })) as ChatMessage[];
    const agent = {
      async *stream(input: { history: unknown[] }) {
        receivedHistory.push(...input.history);
        yield "北京";
        yield "晴朗";
      },
    };
    const { service, messageRepository, conversationRepository } = createService(agent, history);
    const events: ChatSseEvent[] = [];

    for await (const event of service.streamReply(CONVERSATION_ID, USER_ID, {
      message: "明天天气",
    })) {
      events.push(event);
    }

    expect(events.map(({ type }) => type)).toEqual(["meta", "delta", "delta", "done"]);
    expect(receivedHistory).toHaveLength(20);
    expect((receivedHistory[0] as { role: string }).role).toBe("assistant");
    expect(conversationRepository.update).toHaveBeenCalledTimes(2);
    expect(conversationRepository.save).toHaveBeenCalledTimes(0);
    expect(messageRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ role: ChatMessageRole.ASSISTANT, content: "北京晴朗" }),
    );
  });

  it("历史消息中的非法数字角色映射为内部错误事件", async () => {
    const history = [
      {
        conversationId: CONVERSATION_ID,
        role: 99,
        content: "invalid",
        createdAt: new Date(),
      },
    ] as unknown as ChatMessage[];
    const { service } = createService(undefined, history);
    const events: ChatSseEvent[] = [];

    for await (const event of service.streamReply(CONVERSATION_ID, USER_ID, { message: "继续" })) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        type: "error",
        data: { code: "AGENT_EXECUTION_FAILED", message: "聊天消息角色数据不合法" },
      },
    ]);
  });

  it("Agent 返回空文本时不保存助手消息", async () => {
    const agent = { async *stream() {} };
    const { service, messageRepository } = createService(agent);
    const events: ChatSseEvent[] = [];

    for await (const event of service.streamReply(CONVERSATION_ID, USER_ID, { message: "天气" })) {
      events.push(event);
    }

    expect(events.map(({ type }) => type)).toEqual(["meta", "error"]);
    expect(events[1]).toMatchObject({
      data: { code: "AGENT_EXECUTION_FAILED", message: "Agent 未返回有效内容" },
    });
    expect(messageRepository.save).toHaveBeenCalledTimes(1);
  });

  it("Guardrail 或输出异常发生时不发送任何 delta，也不保存助手消息", async () => {
    const agent = {
      async *stream() {
        yield "不应发送";
        throw new BadRequestException("请求未通过 Agent 安全校验，请调整后重试。");
      },
    };
    const { service, messageRepository } = createService(agent);
    const events: ChatSseEvent[] = [];

    for await (const event of service.streamReply(CONVERSATION_ID, USER_ID, { message: "天气" })) {
      events.push(event);
    }

    expect(events.map(({ type }) => type)).toEqual(["meta", "error"]);
    expect(events[1]).toMatchObject({
      data: { message: "请求未通过 Agent 安全校验，请调整后重试。" },
    });
    expect(messageRepository.save).toHaveBeenCalledTimes(1);
  });

  it("超长 Agent 输出被拒绝且不保存助手消息", async () => {
    const agent = {
      async *stream() {
        yield "x".repeat(32_001);
      },
    };
    const { service, messageRepository } = createService(agent);
    const events: ChatSseEvent[] = [];

    for await (const event of service.streamReply(CONVERSATION_ID, USER_ID, { message: "天气" })) {
      events.push(event);
    }

    expect(events.map(({ type }) => type)).toEqual(["meta", "error"]);
    expect(events[1]).toMatchObject({ data: { message: "Agent 输出超出允许长度" } });
    expect(messageRepository.save).toHaveBeenCalledTimes(1);
  });

  it("Agent HTTP 异常保留业务消息，未知异常隐藏底层细节", async () => {
    const httpErrorAgent = {
      stream() {
        return {
          async next() {
            throw new ServiceUnavailableException("Agent 服务未配置");
          },
          [Symbol.asyncIterator]() {
            return this;
          },
        };
      },
    };
    const { service } = createService(httpErrorAgent);
    const httpEvents: ChatSseEvent[] = [];
    for await (const event of service.streamReply(CONVERSATION_ID, USER_ID, { message: "天气" })) {
      httpEvents.push(event);
    }
    expect(httpEvents[1]).toMatchObject({ data: { message: "Agent 服务未配置" } });

    const unknownErrorAgent = {
      stream() {
        return {
          async next() {
            throw new Error("secret model details");
          },
          [Symbol.asyncIterator]() {
            return this;
          },
        };
      },
    };
    const unknownService = createService(unknownErrorAgent).service;
    const unknownEvents: ChatSseEvent[] = [];
    for await (const event of unknownService.streamReply(CONVERSATION_ID, USER_ID, {
      message: "天气",
    })) {
      unknownEvents.push(event);
    }
    expect(unknownEvents[1]).toMatchObject({ data: { message: "Agent 暂时不可用" } });
  });

  it("请求已中止时只发送元信息，不保存助手消息", async () => {
    const controller = new AbortController();
    controller.abort();
    const { service, messageRepository } = createService(undefined, []);
    const events: ChatSseEvent[] = [];

    for await (const event of service.streamReply(
      CONVERSATION_ID,
      USER_ID,
      { message: "天气" },
      controller.signal,
    )) {
      events.push(event);
    }

    expect(events.map(({ type }) => type)).toEqual(["meta"]);
    expect(messageRepository.save).toHaveBeenCalledTimes(1);
  });
});
