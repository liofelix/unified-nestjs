/**
 * 管理员授权守卫。
 * JWT 只负责确认身份，本守卫根据认证阶段从数据库读取的当前角色编码
 * 限制用户、角色等管理接口只能由 admin 角色访问。
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { JwtAuthenticatedUser } from "../auth.types";
import { SYSTEM_ROLE_CODES } from "../../roles/roles.constants";

/** 已完成 JWT 认证的 Express 请求。 */
type AuthenticatedRequest = Request & { user?: JwtAuthenticatedUser };

/** 仅允许当前用户具备 admin 角色的授权守卫。 */
@Injectable()
export class AdminGuard implements CanActivate {
  /** 检查请求上下文中的动态角色集合。 */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user?.roleCodes?.includes(SYSTEM_ROLE_CODES.admin)) {
      return true;
    }

    throw new ForbiddenException();
  }
}
