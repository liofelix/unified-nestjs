/**
 * 认证接口控制器。
 * 暴露公开登录接口和需要访问令牌的注销接口。
 */
import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import type { JwtAuthenticatedUser } from "./auth.types";
import { Public } from "./decorators/public.decorator";
import { LoginDto } from "./dto/login.dto";

@ApiTags("认证")
/** 处理登录与注销请求的控制器。 */
@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  /** 注入认证服务，控制器本身不直接处理密码或令牌逻辑。 */
  constructor(private readonly authService: AuthService) {}

  /** 校验账号密码并签发访问令牌；该路由显式公开。 */
  @Post("login")
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /** 撤销当前请求携带的访问令牌，防止其继续使用。 */
  @Post("logout")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  logout(@Req() request: Request & { user: JwtAuthenticatedUser }) {
    return this.authService.logout(request.user);
  }
}
