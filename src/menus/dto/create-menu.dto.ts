/**
 * 创建菜单请求 DTO。
 * 定义菜单基础资料、路由信息和按钮权限编码的输入边界。
 */
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { BINARY_STATUSES, BinaryStatus } from "../../common/types/binary-status";
import { MENU_TYPE_PAGE, MENU_TYPES, MenuType } from "../menus.constants";

/** 去除字符串首尾空白，非字符串值交由校验器处理。 */
function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

/** 菜单创建参数。 */
export class CreateMenuDto {
  /** 稳定菜单编码。 */
  @ApiProperty({ example: "system-users", minLength: 1, maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  code!: string;

  /** 菜单显示名称。 */
  @ApiProperty({ example: "用户管理", minLength: 1, maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  /** 菜单节点类型。 */
  @ApiProperty({ enum: MENU_TYPES, example: MENU_TYPE_PAGE, type: Number })
  @IsInt()
  @IsEnum(MenuType)
  type!: MenuType;

  /** 父级菜单 UUID；根节点不传或传 null。 */
  @ApiPropertyOptional({ example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", nullable: true })
  @IsOptional()
  @IsUUID("4")
  parentId?: string | null;

  /** 页面或目录路由路径。 */
  @ApiPropertyOptional({ example: "/system/users", maxLength: 255, nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  path?: string | null;

  /** 页面组件标识。 */
  @ApiPropertyOptional({ example: "system/users/index", maxLength: 255, nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  component?: string | null;

  /** 菜单图标标识。 */
  @ApiPropertyOptional({ example: "user", maxLength: 100, nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string | null;

  /** 按钮权限编码，仅按钮节点使用。 */
  @ApiPropertyOptional({ example: "system:user:create", maxLength: 100, nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  permission?: string | null;

  /** 同级排序值，默认值为 0。 */
  @ApiPropertyOptional({ type: Number, example: 10, default: 0, minimum: 0 })
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null) {
      return value;
    }

    return Number(value);
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  /** 是否在前端导航中显示，0 表示隐藏，1 表示显示。 */
  @ApiPropertyOptional({
    enum: BINARY_STATUSES,
    example: BinaryStatus.YES,
    default: BinaryStatus.YES,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @IsEnum(BinaryStatus)
  isVisible?: BinaryStatus;
}
