/**
 * 更新用户请求 DTO。
 * 复用创建用户 DTO 的用户名、邮箱和角色字段，并将它们全部设为可选。
 */
import { PartialType, PickType } from "@nestjs/swagger";
import { CreateUserDto } from "./create-user.dto";

/** 用户资料的部分更新参数。 */
export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, ["username", "email", "roleIds"] as const),
) {}
