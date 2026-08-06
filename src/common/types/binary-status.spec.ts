/**
 * 数字业务枚举单元测试。
 * 固定数据库和 HTTP 契约中的状态、菜单类型及聊天角色编码。
 */
import { describe, expect, it } from "vitest";
import { ChatMessageRole, CHAT_MESSAGE_ROLES } from "../../chat/chat.constants";
import { MenuType, MENU_TYPES } from "../../menus/menus.constants";
import { BINARY_STATUSES, BinaryStatus } from "./binary-status";

describe("numeric business enums", () => {
  it("保持二值状态编码为 0 和 1", () => {
    expect(BinaryStatus.NO).toBe(0);
    expect(BinaryStatus.YES).toBe(1);
    expect(BINARY_STATUSES).toEqual([0, 1]);
  });

  it("保持菜单类型和聊天角色编码稳定", () => {
    expect([MenuType.DIRECTORY, MenuType.PAGE, MenuType.BUTTON]).toEqual([1, 2, 3]);
    expect(MENU_TYPES).toEqual([1, 2, 3]);
    expect([ChatMessageRole.USER, ChatMessageRole.ASSISTANT]).toEqual([1, 2]);
    expect(CHAT_MESSAGE_ROLES).toEqual([1, 2]);
  });
});
