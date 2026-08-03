/**
 * 更新角色请求 DTO。
 * 角色编码、名称、说明和菜单关联均可部分更新，系统角色的 code 由服务层额外保护。
 */
import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { ArrayUnique, IsArray, IsOptional, IsUUID } from "class-validator";
import { CreateRoleDto } from "./create-role.dto";

/** 角色资料的部分更新参数。 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  /** 角色菜单 UUID 列表；未传时保持原关联，空数组表示清空。 */
  @ApiPropertyOptional({
    type: [String],
    example: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  menuIds?: string[];
}
