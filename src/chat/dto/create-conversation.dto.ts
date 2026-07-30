import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateConversationDto {
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

  @ApiPropertyOptional({
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    description: "项目空间 ID，不传表示无项目空间",
    nullable: true,
  })
  @IsOptional()
  @IsUUID("4")
  projectId?: string | null;

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
