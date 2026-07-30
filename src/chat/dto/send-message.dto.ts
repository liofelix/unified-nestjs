import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class SendMessageDto {
  @ApiProperty({ example: "明天北京什么天气？", minLength: 1, maxLength: 4000 })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;
}
