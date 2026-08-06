/**
 * 用户服务单元测试。
 * 使用内存 Repository 和角色服务替身覆盖密码、事务、分页、更新和软删除行为。
 */
import { vi } from "vitest";

const bcryptHash = vi.hoisted(() => vi.fn());
vi.mock("bcrypt", () => ({ hash: bcryptHash }));

import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { BinaryStatus } from "../common/types/binary-status";
import { User } from "./entities/user.entity";
import { UsersService } from "./users.service";

const USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

function createQueryBuilder<T>(result: T) {
  const builder = {
    addSelect: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn().mockResolvedValue(result),
    getOne: vi.fn().mockResolvedValue(result),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };

  return builder;
}

function createService() {
  const user = {
    id: USER_ID,
    username: "alice",
    email: "alice@example.com",
    password: "hashed",
    roles: [],
    isDeleted: BinaryStatus.NO,
    deletedAt: null,
  } as unknown as User;
  const managerRepository = {
    create: vi.fn((value) => ({ ...value })),
    findOne: vi.fn().mockResolvedValue(user),
    save: vi.fn().mockImplementation(async (value) => ({ ...value, id: value.id ?? USER_ID })),
  };
  const manager = {
    getRepository: vi.fn().mockReturnValue(managerRepository),
  };
  const repository = {
    createQueryBuilder: vi.fn().mockReturnValue(createQueryBuilder(user)),
    manager: {
      transaction: vi.fn(async (callback: (value: typeof manager) => unknown) => callback(manager)),
    },
    save: vi.fn().mockImplementation(async (value) => value),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
  };
  const rolesService = {
    findActiveByIds: vi.fn().mockResolvedValue([]),
    resolveRolesForNewUser: vi.fn().mockResolvedValue([]),
  };
  const service = new UsersService(repository as never, rolesService as never);

  return { service, user, repository, manager, managerRepository, rolesService };
}

describe("UsersService", () => {
  it("哈希密码并在事务中创建用户", async () => {
    bcryptHash.mockResolvedValueOnce("hashed-password");
    const { service, managerRepository, rolesService, repository } = createService();
    const createdUser = {
      id: USER_ID,
      username: "alice",
      email: "alice@example.com",
    } as unknown as User;
    const queryBuilder = createQueryBuilder(createdUser);
    repository.createQueryBuilder.mockReturnValue(queryBuilder);
    rolesService.resolveRolesForNewUser.mockResolvedValueOnce([{ id: "role-user" }]);
    managerRepository.save.mockResolvedValueOnce({ id: USER_ID });

    await expect(
      service.create(
        {
          username: "alice",
          email: "alice@example.com",
          password: "password123",
          roleIds: [],
        },
        USER_ID,
      ),
    ).resolves.toEqual(createdUser);

    expect(bcryptHash).toHaveBeenCalledWith("password123", 12);
    expect(rolesService.resolveRolesForNewUser).toHaveBeenCalledWith([], expect.anything());
    expect(managerRepository.create).toHaveBeenCalledWith({
      username: "alice",
      email: "alice@example.com",
      password: "hashed-password",
      roles: [{ id: "role-user" }],
      createdBy: USER_ID,
    });
  });

  it("按创建时间倒序分页查询未删除用户", async () => {
    const { service, repository } = createService();
    const queryBuilder = createQueryBuilder([[{ id: USER_ID }], 1]);
    repository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.findAll({ pageNo: 2, pageSize: 10 })).resolves.toEqual({
      items: [{ id: USER_ID }],
      total: 1,
      pageNo: 2,
      pageSize: 10,
    });
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.take).toHaveBeenCalledWith(10);
  });

  it("找不到用户时返回 404", async () => {
    const { service, repository } = createService();
    const queryBuilder = createQueryBuilder(null);
    repository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.findOne(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("在事务中更新资料并替换显式传入的角色", async () => {
    const { service, repository, managerRepository, rolesService } = createService();
    const queryBuilder = createQueryBuilder({ id: USER_ID, username: "updated" });
    repository.createQueryBuilder.mockReturnValue(queryBuilder);
    rolesService.findActiveByIds.mockResolvedValueOnce([{ id: "role-editor" }]);

    await expect(
      service.update(USER_ID, { username: "updated", roleIds: ["role-editor"] }, USER_ID),
    ).resolves.toEqual({ id: USER_ID, username: "updated" });

    expect(rolesService.findActiveByIds).toHaveBeenCalledWith(["role-editor"], expect.anything());
    expect(managerRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ username: "updated", roles: [{ id: "role-editor" }] }),
    );
  });

  it("软删除用户并写入删除时间", async () => {
    const { service, repository } = createService();

    await service.remove(USER_ID, USER_ID);

    expect(repository.update).toHaveBeenCalledWith(
      { id: USER_ID, isDeleted: BinaryStatus.NO },
      expect.objectContaining({ isDeleted: BinaryStatus.YES, deletedBy: USER_ID }),
    );
  });

  it("返回当前未删除用户和活动角色编码", async () => {
    const { service, repository } = createService();
    const queryBuilder = createQueryBuilder({
      id: USER_ID,
      username: "alice",
      email: "alice@example.com",
      roles: [{ code: "admin" }, { code: "admin" }, { code: "user" }],
    });
    repository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.findActiveAuthContext(USER_ID)).resolves.toEqual({
      id: USER_ID,
      username: "alice",
      email: "alice@example.com",
      roleCodes: ["admin", "user"],
    });
  });

  it("按用户名查询并显式加载密码字段", async () => {
    const { service, repository, user } = createService();
    const queryBuilder = createQueryBuilder(user);
    repository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.findByUsernameWithPassword("alice")).resolves.toBe(user);
    expect(queryBuilder.addSelect).toHaveBeenCalledWith("user.password");
    expect(queryBuilder.where).toHaveBeenCalledWith("user.isDeleted = :isDeleted", {
      isDeleted: BinaryStatus.NO,
    });
  });
});
