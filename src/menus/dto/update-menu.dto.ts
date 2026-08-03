/**
 * 更新菜单请求 DTO。
 * 将创建菜单参数转换为可部分更新的结构。
 */
import { PartialType } from "@nestjs/swagger";
import { CreateMenuDto } from "./create-menu.dto";

/** 菜单资料的部分更新参数。 */
export class UpdateMenuDto extends PartialType(CreateMenuDto) {}
