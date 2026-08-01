/**
 * 创建角色请求 DTO。
 * 约束角色编码、名称和说明的输入格式，并为 Swagger 提供示例。
 */
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** 创建角色所需的参数。 */
export class CreateRoleDto {
  /** 稳定角色编码。 */
  @ApiProperty({ example: "editor", minLength: 1, maxLength: 50 })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  /** 角色显示名称。 */
  @ApiProperty({ example: "编辑", minLength: 1, maxLength: 50 })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  /** 可选角色说明。 */
  @ApiPropertyOptional({ example: "可维护内容", maxLength: 255, nullable: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  description?: string | null;
}
