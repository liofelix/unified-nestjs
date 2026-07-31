/**
 * 会话列表查询 DTO。
 * 将分页参数转换为数字，并支持按项目空间和 Agent code 筛选。
 */
import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

/** 会话分页和筛选参数。 */
export class ListConversationsDto {
  /** 页码，从 1 开始，默认返回第 1 页。 */
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @Transform(({ value }: { value: unknown }) => (value === undefined ? 1 : Number(value)))
  @IsInt()
  @Min(1)
  page: number = 1;

  /** 每页数量，默认 20，最大 100。 */
  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @Transform(({ value }: { value: unknown }) => (value === undefined ? 20 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  /** 可选项目空间 UUID。 */
  @ApiPropertyOptional({ example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })
  @IsOptional()
  @IsUUID("4")
  projectId?: string;

  /** 可选 Agent code 筛选条件。 */
  @ApiPropertyOptional({ example: "weather", maxLength: 50 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  agentCode?: string;
}
