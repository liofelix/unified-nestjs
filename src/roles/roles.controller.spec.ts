/**
 * 角色控制器单元测试。
 * 验证角色接口和角色菜单接口传递当前认证用户 ID。
 */
import { describe, expect, it, vi } from "vitest";
import { RolesController } from "./roles.controller";

describe("RolesController", () => {
  it("转发角色 CRUD 和菜单查询", async () => {
    const rolesService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    const menusService = { findRoleMenuIds: vi.fn() };
    const controller = new RolesController(rolesService as never, menusService as never);
    const request = { user: { id: "actor-1" } };

    await controller.create({ code: "editor", name: "编辑" }, request as never);
    await controller.findAll({ pageNo: 1, pageSize: 20 });
    await controller.findOne("role-1");
    await controller.findMenus("role-1", request as never);
    await controller.update("role-1", { name: "更新" }, request as never);
    await controller.remove("role-1", request as never);

    expect(rolesService.create).toHaveBeenCalledWith({ code: "editor", name: "编辑" }, "actor-1");
    expect(rolesService.findAll).toHaveBeenCalledWith({ pageNo: 1, pageSize: 20 });
    expect(rolesService.findOne).toHaveBeenCalledWith("role-1");
    expect(menusService.findRoleMenuIds).toHaveBeenCalledWith("role-1", "actor-1");
    expect(rolesService.update).toHaveBeenCalledWith("role-1", { name: "更新" }, "actor-1");
    expect(rolesService.remove).toHaveBeenCalledWith("role-1", "actor-1");
  });
});
