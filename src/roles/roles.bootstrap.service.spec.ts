/**
 * 系统角色初始化服务单元测试。
 * 验证缺失角色创建和已有角色状态修复的幂等行为。
 */
import { describe, expect, it, vi } from "vitest";
import { BinaryStatus } from "../common/types/binary-status";
import { RolesBootstrapService } from "./roles.bootstrap.service";

describe("RolesBootstrapService", () => {
  it("创建缺失的 admin 和 user 角色", async () => {
    const repository = {
      create: vi.fn((value) => value),
      find: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue([]),
    };

    await new RolesBootstrapService(repository as never).onApplicationBootstrap();

    expect(repository.create).toHaveBeenCalledTimes(2);
    expect(repository.find).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledWith({ where: { code: expect.anything() } });
    expect(repository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ code: "admin", isSystem: BinaryStatus.YES }),
        expect.objectContaining({ code: "user", isSystem: BinaryStatus.YES }),
      ]),
    );
    expect(repository.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ code: "admin", isSystem: BinaryStatus.YES }),
    );
  });

  it("恢复已有系统角色的系统标记和软删除状态", async () => {
    const role = {
      code: "admin",
      isSystem: BinaryStatus.NO,
      isDeleted: BinaryStatus.YES,
      deletedAt: new Date(),
      deletedBy: "actor",
    };
    const repository = {
      create: vi.fn(),
      find: vi.fn().mockResolvedValue([role]),
      save: vi.fn().mockResolvedValue([role]),
    };

    await new RolesBootstrapService(repository as never).onApplicationBootstrap();

    expect(role).toMatchObject({
      isSystem: BinaryStatus.YES,
      isDeleted: BinaryStatus.NO,
      deletedAt: null,
      deletedBy: null,
    });
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
