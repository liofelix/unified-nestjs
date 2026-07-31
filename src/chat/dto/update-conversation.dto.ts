/**
 * 更新会话请求 DTO。
 * 标题和项目空间均为可选字段，项目空间可显式传 null 解除关联。
 */
import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

/** 会话资料的部分更新参数。 */
export class UpdateConversationDto {
  /** 新会话标题。 */
  @ApiPropertyOptional({ example: "北京未来两天天气", minLength: 1, maxLength: 200 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  /** 新项目空间 UUID；传 null 时清除原有项目关联。 */
  @ApiPropertyOptional({
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    description: "项目空间 ID；传 null 可解除关联",
    nullable: true,
  })
  @IsOptional()
  @IsUUID("4")
  projectId?: string | null;
}
