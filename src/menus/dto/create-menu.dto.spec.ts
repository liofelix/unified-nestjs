/**
 * 菜单 DTO 单元测试。
 * 验证数字枚举、字符串清理、排序转换和按钮权限字段校验。
 */
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { BinaryStatus } from "../../common/types/binary-status";
import { MenuType } from "../menus.constants";
import { CreateMenuDto } from "./create-menu.dto";
import { UpdateMenuDto } from "./update-menu.dto";

describe("Menu DTOs", () => {
  it("转换文本和排序字段并接受合法数字枚举", async () => {
    const dto = plainToInstance(CreateMenuDto, {
      code: " root ",
      name: " 根 ",
      type: 2,
      path: " /root ",
      component: " root/index ",
      sort: "3",
      isVisible: BinaryStatus.YES,
    });

    expect(dto).toMatchObject({
      code: "root",
      name: "根",
      type: 2,
      path: "/root",
      component: "root/index",
      sort: 3,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("允许按钮权限参数且拒绝非法枚举和负排序", async () => {
    const button = plainToInstance(CreateMenuDto, {
      code: "view",
      name: "查看",
      type: MenuType.BUTTON,
      permission: "system:view",
    });
    await expect(validate(button)).resolves.toHaveLength(0);

    const invalid = plainToInstance(UpdateMenuDto, { type: "directory", sort: "-1" });
    const errors = await validate(invalid);
    expect(errors.map(({ property }) => property)).toEqual(["type", "sort"]);
  });
});
