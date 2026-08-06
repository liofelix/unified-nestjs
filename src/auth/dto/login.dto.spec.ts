/**
 * 登录 DTO 单元测试。
 * 验证用户名密码的长度边界和类型校验。
 */
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { LoginDto } from "./login.dto";

describe("LoginDto", () => {
  it("接受合法登录参数", async () => {
    const errors = await validate(
      plainToInstance(LoginDto, { username: "alice", password: "password123" }),
    );

    expect(errors).toHaveLength(0);
  });

  it("拒绝空用户名和过短密码", async () => {
    const errors = await validate(plainToInstance(LoginDto, { username: "", password: "short" }));

    expect(errors.map(({ property }) => property)).toEqual(["username", "password"]);
  });
});
