/**
 * 会话列表查询 DTO。
 * 复用公共分页参数，并支持按项目空间和 Agent code 筛选。
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

/** 会话分页和筛选参数。 */
export class ListConversationsDto extends PaginationDto {
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
