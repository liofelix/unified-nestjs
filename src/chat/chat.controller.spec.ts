/**
 * 聊天控制器单元测试。
 * 验证会话 CRUD 和消息查询从认证请求读取用户 ID。
 */
import { describe, expect, it, vi } from "vitest";
import { ChatController } from "./chat.controller";

describe("ChatController", () => {
  it("转发会话和消息接口参数", async () => {
    const chatService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      getMessages: vi.fn(),
    };
    const controller = new ChatController(chatService as never);
    const request = { user: { id: "user-1" } };

    await controller.create({ agentCode: "weather" }, request as never);
    await controller.findAll({ pageNo: 1, pageSize: 20 }, request as never);
    await controller.findOne("conversation-1", request as never);
    await controller.update("conversation-1", { title: "新标题" }, request as never);
    await controller.remove("conversation-1", request as never);
    await controller.getMessages("conversation-1", request as never);

    expect(chatService.create).toHaveBeenCalledWith("user-1", { agentCode: "weather" });
    expect(chatService.findAll).toHaveBeenCalledWith("user-1", { pageNo: 1, pageSize: 20 });
    expect(chatService.findOne).toHaveBeenCalledWith("conversation-1", "user-1");
    expect(chatService.update).toHaveBeenCalledWith("conversation-1", "user-1", {
      title: "新标题",
    });
    expect(chatService.remove).toHaveBeenCalledWith("conversation-1", "user-1");
    expect(chatService.getMessages).toHaveBeenCalledWith("conversation-1", "user-1");
  });
});
