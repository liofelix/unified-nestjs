/**
 * 认证领域共享类型。
 * 这些类型描述登录响应、JWT 载荷以及 Passport 注入到请求中的用户信息。
 */
/** 登录成功后返回给客户端的令牌响应。 */
export interface AuthResponse {
  /** Bearer 访问令牌。 */
  accessToken: string;
}

/** JWT 中由本应用签发并在校验阶段读取的字段。 */
export interface JwtPayload {
  /** 用户 UUID。 */
  sub: string;
  /** 用户名。 */
  username: string;
  /** 用户邮箱。 */
  email: string;
  /** 令牌用途，当前必须为 access。 */
  type: string;
  /** 令牌唯一 ID，用于撤销。 */
  jti: string;
  /** Unix 秒级过期时间。 */
  exp: number;
}

/** JWT 策略验证成功后挂载到请求上的用户信息。 */
export interface JwtAuthenticatedUser {
  /** 用户 UUID。 */
  id: string;
  /** 用户名。 */
  username: string;
  /** 用户邮箱。 */
  email: string;
  /** 当前令牌唯一 ID。 */
  tokenId: string;
  /** 当前令牌过期时间。 */
  expiresAt: number;
}
