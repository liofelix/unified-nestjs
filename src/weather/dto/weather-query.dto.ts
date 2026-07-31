/**
 * 天气查询 DTO。
 * 规范化城市和国家代码输入，并限制第三方地理编码查询的参数范围。
 */
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO31661Alpha2, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** 地理位置查询参数。 */
export class WeatherQueryDto {
  /** 城市名称，提交前会去除首尾空白。 */
  @ApiProperty({ example: "北京", minLength: 2, maxLength: 100, description: "城市名称" })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  /** 可选的 ISO 3166-1 Alpha-2 国家代码，最终转换为大写。 */
  @ApiPropertyOptional({ example: "CN", description: "ISO 3166-1 Alpha-2 国家代码" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsISO31661Alpha2()
  countryCode?: string;
}
