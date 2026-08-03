/**
 * 角色管理控制器。
 * 提供受 JWT 保护的角色 CRUD，并将当前认证用户用于审计字段。
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthenticatedUser } from "../auth/auth.types";
import { PaginationDto } from "../common/dto/pagination.dto";
import { MenusService } from "../menus/menus.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RolesService } from "./roles.service";

/** 已通过 JWT 守卫并携带认证用户上下文的 Express 请求类型。 */
type AuthenticatedRequest = Request & { user: JwtAuthenticatedUser };

@ApiTags("角色")
@ApiBearerAuth()
/** 将角色 HTTP 请求委托给 RolesService 的控制器。 */
@Controller("roles")
export class RolesController {
  /** 注入角色业务服务。 */
  constructor(
    private readonly rolesService: RolesService,
    private readonly menusService: MenusService,
  ) {}

  /** 创建普通角色。 */
  @Post()
  create(@Body() dto: CreateRoleDto, @Req() request: AuthenticatedRequest) {
    return this.rolesService.create(dto, request.user.id);
  }

  /** 按分页参数返回未删除角色。 */
  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.rolesService.findAll(query);
  }

  /** 查询角色直接关联的有效菜单 ID。 */
  @Get(":id/menus")
  findMenus(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menusService.findRoleMenuIds(id, request.user.id);
  }

  /** 查询单个未删除角色。 */
  @Get(":id")
  findOne(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
    return this.rolesService.findOne(id);
  }

  /** 更新角色资料并写入更新人。 */
  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.rolesService.update(id, dto, request.user.id);
  }

  /** 软删除未关联用户的普通角色。 */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.rolesService.remove(id, request.user.id);
  }
}
