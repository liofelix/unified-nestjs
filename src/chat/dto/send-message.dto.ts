/**
 * 发送消息 DTO。
 * 对用户消息做字符串转换、去空格和长度校验，作为 SSE 对话的输入。
 */
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/** 单次发送给 Agent 的用户消息。 */
export class SendMessageDto {
  /** 消息正文，长度限制为 1 到 4000 个字符。 */
  @ApiProperty({ example: "明天北京什么天气？", minLength: 1, maxLength: 4000 })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;
}
