/**
 * 创建会话请求 DTO。
 * 校验 Agent code，并允许可选的项目空间和会话标题。
 */
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

/** 创建聊天会话所需的参数。 */
export class CreateConversationDto {
  /** 要绑定的 Agent 稳定 code。 */
  @ApiProperty({
    example: "weather",
    minLength: 1,
    maxLength: 50,
    description: "绑定的 Agent code",
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  agentCode!: string;

  /** 可选项目空间 UUID；不传或传 null 表示不关联项目。 */
  @ApiPropertyOptional({
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    description: "项目空间 ID，不传表示无项目空间",
    nullable: true,
  })
  @IsOptional()
  @IsUUID("4")
  projectId?: string | null;

  /** 可选会话标题；未提供时由服务使用默认标题。 */
  @ApiPropertyOptional({
    example: "北京天气",
    minLength: 1,
    maxLength: 200,
    description: "会话标题",
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;
}
