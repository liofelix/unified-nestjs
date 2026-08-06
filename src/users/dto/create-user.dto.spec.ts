/**
 * 用户 DTO 单元测试。
 * 验证注册字段边界、邮箱格式和角色 UUID 数组约束。
 */
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateUserDto } from "./create-user.dto";
import { UpdateUserDto } from "./update-user.dto";

describe("CreateUserDto", () => {
  it("接受合法用户和角色参数", async () => {
    const dto = plainToInstance(CreateUserDto, {
      username: "alice",
      email: "alice@example.com",
      password: "password123",
      roleIds: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("拒绝重复角色和非法邮箱", async () => {
    const dto = plainToInstance(CreateUserDto, {
      username: "a",
      email: "invalid",
      password: "short",
      roleIds: ["not-a-uuid", "not-a-uuid"],
    });
    const errors = await validate(dto);

    expect(errors.map(({ property }) => property)).toEqual([
      "username",
      "email",
      "password",
      "roleIds",
    ]);
  });

  it("拒绝超过上限的角色数组", async () => {
    const dto = plainToInstance(CreateUserDto, {
      username: "alice",
      email: "alice@example.com",
      password: "password123",
      roleIds: Array.from(
        { length: 101 },
        (_, index) => `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
      ),
    });

    expect((await validate(dto)).map(({ property }) => property)).toContain("roleIds");
  });
});

describe("UpdateUserDto", () => {
  it("允许部分更新且不要求密码", async () => {
    const dto = plainToInstance(UpdateUserDto, { username: "updated" });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
