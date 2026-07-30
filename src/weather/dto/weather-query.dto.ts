import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO31661Alpha2, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class WeatherQueryDto {
  @ApiProperty({ example: "北京", minLength: 2, maxLength: 100, description: "城市名称" })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional({ example: "CN", description: "ISO 3166-1 Alpha-2 国家代码" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsISO31661Alpha2()
  countryCode?: string;
}
