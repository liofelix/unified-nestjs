/**
 * 访问令牌撤销服务。
 * 使用 Redis 按令牌 ID 保存撤销标记，并让标记的 TTL 不超过令牌剩余有效期。
 */
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { RedisService } from "../infrastructure/redis/redis.service";

const REVOKED_TOKEN_PREFIX = "auth:revoked:";
/** Redis 不可用时对外返回的统一认证服务错误。 */
const AUTH_SERVICE_UNAVAILABLE_MESSAGE = "认证服务暂不可用";

/** 管理访问令牌的撤销与查询。 */
@Injectable()
export class AuthRevocationService {
  /** 注入 Redis 封装，避免认证领域直接管理 Redis 客户端生命周期。 */
  constructor(private readonly redisService: RedisService) {}

  /** 在令牌剩余有效期内写入撤销标记。 */
  async revoke(tokenId: string, expiresAt: number): Promise<void> {
    const ttl = Math.max(expiresAt - Math.floor(Date.now() / 1000), 1);

    await this.execute(() =>
      this.redisService.getClient().set(`${REVOKED_TOKEN_PREFIX}${tokenId}`, "1", "EX", ttl),
    );
  }

  /** 判断指定令牌 ID 是否已被撤销。 */
  async isRevoked(tokenId: string): Promise<boolean> {
    return (
      (await this.execute(() =>
        this.redisService.getClient().exists(`${REVOKED_TOKEN_PREFIX}${tokenId}`),
      )) === 1
    );
  }

  /** 检查 Redis 就绪状态，并将底层故障转换为统一服务不可用异常。 */
  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.redisService.isReady) {
      throw new ServiceUnavailableException(AUTH_SERVICE_UNAVAILABLE_MESSAGE);
    }

    try {
      return await operation();
    } catch {
      throw new ServiceUnavailableException(AUTH_SERVICE_UNAVAILABLE_MESSAGE);
    }
  }
}
