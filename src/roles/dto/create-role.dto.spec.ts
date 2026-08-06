/**
 * 角色 DTO 单元测试。
 * 验证字符串清理、字段边界和菜单 UUID 数组校验。
 */
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateRoleDto } from "./create-role.dto";
import { UpdateRoleDto } from "./update-role.dto";

describe("Role DTOs", () => {
  it("转换并接受合法角色参数", async () => {
    const dto = plainToInstance(UpdateRoleDto, {
      code: " editor ",
      name: " 编辑 ",
      menuIds: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
    });

    expect(dto).toMatchObject({ code: "editor", name: "编辑" });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("拒绝空编码、空名称和重复菜单 ID", async () => {
    const dto = plainToInstance(CreateRoleDto, { code: "", name: "" });
    const createErrors = await validate(dto);
    expect(createErrors.map(({ property }) => property)).toEqual(["code", "name"]);

    const updateErrors = await validate(
      plainToInstance(UpdateRoleDto, { menuIds: ["not-a-uuid", "not-a-uuid"] }),
    );
    expect(updateErrors.map(({ property }) => property)).toEqual(["menuIds"]);
  });

  it("拒绝超过上限的菜单数组", async () => {
    const dto = plainToInstance(UpdateRoleDto, {
      menuIds: Array.from(
        { length: 101 },
        (_, index) => `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
      ),
    });

    expect((await validate(dto)).map(({ property }) => property)).toContain("menuIds");
  });
});
