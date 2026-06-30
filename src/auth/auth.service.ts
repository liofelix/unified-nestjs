import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { LoginDto } from "./dto/login.dto";
import { AuthResponse } from "./auth.types";
import { UsersService } from "../users/users.service";

export const INVALID_CREDENTIALS_MESSAGE = "用户名或密码错误";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByUsernameWithPassword(loginDto.username);

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        username: user.username,
        email: user.email,
        type: "access",
      }),
    };
  }

  logout(): null {
    return null;
  }
}
