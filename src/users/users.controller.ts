/**
 * 用户管理控制器。
 * 提供受 JWT 保护的用户创建、查询、更新和软删除接口。
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
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { JwtAuthenticatedUser } from "../auth/auth.types";
import { AdminGuard } from "../auth/guards/admin.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("用户")
@ApiBearerAuth()
@UseGuards(AdminGuard)
/** 将 HTTP 请求委托给 UsersService 的控制器。 */
@Controller("users")
export class UsersController {
  /** 注入用户业务服务。 */
  constructor(private readonly usersService: UsersService) {}

  /** 创建用户并返回不含密码的用户信息。 */
  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @Req() request: Request & { user: JwtAuthenticatedUser },
  ) {
    return this.usersService.create(createUserDto, request.user.id);
  }

  /** 按分页参数返回未删除用户。 */
  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query);
  }

  /** 按 UUID 查询单个未删除用户。 */
  @Get(":id")
  findOne(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
    return this.usersService.findOne(id);
  }

  /** 更新用户资料；请求携带 roleIds 时会在同一事务中替换用户全部角色。 */
  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: Request & { user: JwtAuthenticatedUser },
  ) {
    return this.usersService.update(id, updateUserDto, request.user.id);
  }

  /** 软删除指定用户。 */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() request: Request & { user: JwtAuthenticatedUser },
  ) {
    return this.usersService.remove(id, request.user.id);
  }
}
