/**
 * 公共分页 DTO 单元测试。
 * 验证字符串查询参数转换、默认值和上下界校验。
 */
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { PaginationDto } from "./pagination.dto";

describe("PaginationDto", () => {
  it("使用默认页码和页大小", async () => {
    const dto = plainToInstance(PaginationDto, {});

    expect(dto).toMatchObject({ pageNo: 1, pageSize: 20 });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("将查询字符串转换为数字", async () => {
    const dto = plainToInstance(PaginationDto, { pageNo: "2", pageSize: "50" });

    expect(dto).toMatchObject({ pageNo: 2, pageSize: 50 });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("拒绝越界分页参数", async () => {
    const dto = plainToInstance(PaginationDto, { pageNo: "0", pageSize: "101" });
    const errors = await validate(dto);

    expect(errors.map(({ property }) => property)).toEqual(["pageNo", "pageSize"]);
  });
});
