/**
 * 菜单管理控制器。
 * 提供受 JWT 保护的菜单 CRUD 和当前用户菜单权限查询接口。
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
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthenticatedUser } from "../auth/auth.types";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { MenusService } from "./menus.service";

/** 已通过 JWT 守卫并携带认证用户上下文的 Express 请求类型。 */
type AuthenticatedRequest = Request & { user: JwtAuthenticatedUser };

@ApiTags("菜单")
@ApiBearerAuth()
/** 将菜单 HTTP 请求委托给 MenusService 的控制器。 */
@Controller("menus")
export class MenusController {
  /** 注入菜单业务服务。 */
  constructor(private readonly menusService: MenusService) {}

  /** 创建菜单并写入创建人。 */
  @Post()
  create(@Body() dto: CreateMenuDto, @Req() request: AuthenticatedRequest) {
    return this.menusService.create(dto, request.user.id);
  }

  /** 查询当前用户可访问的菜单树和按钮权限。 */
  @Get("current")
  findCurrent(@Req() request: AuthenticatedRequest) {
    return this.menusService.findCurrentUserMenus(request.user);
  }

  /** 返回全部未删除菜单组成的完整树。 */
  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.menusService.findAll(request.user.id);
  }

  /** 查询单个未删除菜单。 */
  @Get(":id")
  findOne(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menusService.findOne(id, request.user.id);
  }

  /** 更新菜单资料并写入更新人。 */
  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateMenuDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menusService.update(id, dto, request.user.id);
  }

  /** 软删除菜单。 */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menusService.remove(id, request.user.id);
  }
}
