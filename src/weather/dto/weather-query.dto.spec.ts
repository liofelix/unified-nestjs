/**
 * 天气查询 DTO 单元测试。
 * 验证城市和国家代码的空白清理、大小写转换及格式边界。
 */
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { WeatherQueryDto } from "./weather-query.dto";

describe("WeatherQueryDto", () => {
  it("清理城市空白并把国家代码转换为大写", async () => {
    const dto = plainToInstance(WeatherQueryDto, { city: " 北京 ", countryCode: " cn " });

    expect(dto).toMatchObject({ city: "北京", countryCode: "CN" });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("拒绝过短城市和非法国家代码", async () => {
    const errors = await validate(
      plainToInstance(WeatherQueryDto, { city: "A", countryCode: "CHN" }),
    );

    expect(errors.map(({ property }) => property)).toEqual(["city", "countryCode"]);
  });
});
