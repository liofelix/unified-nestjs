/**
 * 更新角色请求 DTO。
 * 角色编码、名称和说明均可部分更新，系统角色的 code 由服务层额外保护。
 */
import { PartialType } from "@nestjs/swagger";
import { CreateRoleDto } from "./create-role.dto";

/** 角色资料的部分更新参数。 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
