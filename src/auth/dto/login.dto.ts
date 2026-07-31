/**
 * 登录请求 DTO。
 * 字段会在全局 ValidationPipe 中执行类型、长度和字符串校验。
 */
import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/** 用户名密码登录参数。 */
export class LoginDto {
  /** 登录用户名，长度限制为 3 到 50 个字符。 */
  @ApiProperty({ example: "admin", minLength: 3, maxLength: 50 })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  /** 登录密码，长度限制为 8 到 72 个字符。 */
  @ApiProperty({ example: "Sec@2026", minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
