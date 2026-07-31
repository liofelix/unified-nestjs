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
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PaginationDto } from "../common/dto/pagination.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("用户")
@ApiBearerAuth()
/** 将 HTTP 请求委托给 UsersService 的控制器。 */
@Controller("users")
export class UsersController {
  /** 注入用户业务服务。 */
  constructor(private readonly usersService: UsersService) {}

  /** 创建用户并返回不含密码的用户信息。 */
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /** 按分页参数返回未删除用户。 */
  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query);
  }

  /** 按 UUID 查询单个未删除用户。 */
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  /** 更新用户的用户名或邮箱。 */
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  /** 软删除指定用户。 */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
