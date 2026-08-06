/**
 * 聊天 DTO 单元测试。
 * 验证会话、筛选和消息输入的转换与边界校验。
 */
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateConversationDto } from "./create-conversation.dto";
import { ListConversationsDto } from "./list-conversations.dto";
import { SendMessageDto } from "./send-message.dto";
import { UpdateConversationDto } from "./update-conversation.dto";

describe("Chat DTOs", () => {
  it("清理会话和消息文本", async () => {
    const createDto = plainToInstance(CreateConversationDto, {
      agentCode: " weather ",
      title: " 北京天气 ",
    });
    const messageDto = plainToInstance(SendMessageDto, { message: " 明天怎么样？ " });

    expect(createDto).toMatchObject({ agentCode: "weather", title: "北京天气" });
    expect(messageDto.message).toBe("明天怎么样？");
    await expect(validate(createDto)).resolves.toHaveLength(0);
    await expect(validate(messageDto)).resolves.toHaveLength(0);
  });

  it("支持分页筛选和显式解除项目关联", async () => {
    const listDto = plainToInstance(ListConversationsDto, {
      pageNo: "2",
      pageSize: "10",
      agentCode: " weather ",
    });
    const updateDto = plainToInstance(UpdateConversationDto, { projectId: null });

    expect(listDto).toMatchObject({ pageNo: 2, pageSize: 10, agentCode: "weather" });
    expect(updateDto.projectId).toBeNull();
    await expect(validate(listDto)).resolves.toHaveLength(0);
    await expect(validate(updateDto)).resolves.toHaveLength(0);
  });

  it("拒绝空消息和过长标题", async () => {
    const errors = await validate(plainToInstance(SendMessageDto, { message: "" }));
    expect(errors.map(({ property }) => property)).toEqual(["message"]);

    const titleErrors = await validate(
      plainToInstance(UpdateConversationDto, { title: "x".repeat(201) }),
    );
    expect(titleErrors.map(({ property }) => property)).toEqual(["title"]);
  });
});
