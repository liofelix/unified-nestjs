/**
 * 公开路由元数据装饰器。
 * 与全局 JwtAuthGuard 配合，显式标记无需 Bearer 令牌的控制器或处理器。
 */
import { SetMetadata } from "@nestjs/common";

/** JwtAuthGuard 读取的公开路由元数据键。 */
export const IS_PUBLIC_KEY = "isPublic";
/** 将路由标记为公开访问。 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
