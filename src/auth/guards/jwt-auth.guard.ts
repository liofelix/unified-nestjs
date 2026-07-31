/**
 * 全局 JWT 鉴权守卫。
 * 默认保护所有路由，仅当处理器或控制器标记 `@Public()` 时跳过 Passport 校验。
 */
import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/** 根据公开元数据决定是否执行 JWT Passport 守卫。 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  /** 注入元数据读取器，用于读取方法级和控制器级公开标记。 */
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /** 公开路由直接放行，其余请求交给 Passport JWT 策略验证。 */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
