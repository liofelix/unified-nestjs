/**
 * 菜单控制器单元测试。
 * 验证菜单接口从认证请求读取 actorId 并转发到 MenusService。
 */
import { describe, expect, it, vi } from "vitest";
import { MenusController } from "./menus.controller";

describe("MenusController", () => {
  it("转发菜单 CRUD 和当前菜单查询", async () => {
    const menusService = {
      create: vi.fn(),
      findCurrentUserMenus: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    const controller = new MenusController(menusService as never);
    const request = { user: { id: "actor-1" } };

    await controller.create({ code: "root", name: "根", type: 1 }, request as never);
    await controller.findCurrent(request as never);
    await controller.findAll(request as never);
    await controller.findOne("menu-1", request as never);
    await controller.update("menu-1", { name: "更新" }, request as never);
    await controller.remove("menu-1", request as never);

    expect(menusService.create).toHaveBeenCalledWith(
      { code: "root", name: "根", type: 1 },
      "actor-1",
    );
    expect(menusService.findCurrentUserMenus).toHaveBeenCalledWith(request.user);
    expect(menusService.findAll).toHaveBeenCalledWith("actor-1");
    expect(menusService.findOne).toHaveBeenCalledWith("menu-1", "actor-1");
    expect(menusService.update).toHaveBeenCalledWith("menu-1", { name: "更新" }, "actor-1");
    expect(menusService.remove).toHaveBeenCalledWith("menu-1", "actor-1");
  });
});
