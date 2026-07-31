/**
 * 公共分页查询 DTO。
 * 为所有列表查询接口提供统一的分页参数：pageNo 与 pageSize。
 */
import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

/** 列表查询接口共用的分页参数。 */
export class PaginationDto {
  /** 页码，从 1 开始，默认返回第 1 页。 */
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @Transform(({ value }: { value: unknown }) => (value === undefined ? 1 : Number(value)))
  @IsInt()
  @Min(1)
  pageNo: number = 1;

  /** 每页数量，默认 20，最大 100。 */
  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @Transform(({ value }: { value: unknown }) => (value === undefined ? 20 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
