/**
 * 创建用户请求 DTO。
 * 定义用户名、邮箱和密码的格式边界，并为 Swagger 提供示例值。
 */
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

/** 创建用户所需的注册信息。 */
export class CreateUserDto {
  /** 唯一用户名，长度限制为 3 到 50 个字符。 */
  @ApiProperty({ example: "zhangsan", minLength: 3, maxLength: 50 })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  /** 唯一邮箱地址。 */
  @ApiProperty({ example: "zhangsan@example.com", maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  /** 登录密码，长度限制为 8 到 72 个字符。 */
  @ApiProperty({ example: "password123", minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
