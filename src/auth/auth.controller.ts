import { Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { JwtAuthenticatedUser } from "./auth.types";
import { Public } from "./decorators/public.decorator";
import { LoginDto } from "./dto/login.dto";

@ApiTags("认证")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("logout")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  logout(@Req() request: Request & { user: JwtAuthenticatedUser }) {
    return this.authService.logout(request.user);
  }
}
