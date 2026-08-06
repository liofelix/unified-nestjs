/**
 * 用户控制器单元测试。
 * 验证用户 CRUD 请求参数和路径 ID 被完整转发给 UsersService。
 */
import { describe, expect, it, vi } from "vitest";
import { UsersController } from "./users.controller";

describe("UsersController", () => {
  it("转发创建、列表、详情、更新和删除操作", async () => {
    const usersService = {
      create: vi.fn().mockResolvedValue({ id: "user-1" }),
      findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      findOne: vi.fn().mockResolvedValue({ id: "user-1" }),
      update: vi.fn().mockResolvedValue({ id: "user-1" }),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const controller = new UsersController(usersService as never);
    const dto = { username: "alice", email: "alice@example.com", password: "password123" };
    const request = { user: { id: "actor-1" } };

    await controller.create(dto, request as never);
    await controller.findAll({ pageNo: 1, pageSize: 20 });
    await controller.findOne("user-1");
    await controller.update("user-1", { username: "updated" }, request as never);
    await controller.remove("user-1", request as never);

    expect(usersService.create).toHaveBeenCalledWith(dto, "actor-1");
    expect(usersService.findAll).toHaveBeenCalledWith({ pageNo: 1, pageSize: 20 });
    expect(usersService.findOne).toHaveBeenCalledWith("user-1");
    expect(usersService.update).toHaveBeenCalledWith("user-1", { username: "updated" }, "actor-1");
    expect(usersService.remove).toHaveBeenCalledWith("user-1", "actor-1");
  });
});
