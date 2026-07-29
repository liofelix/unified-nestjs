import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { RedisService } from "../infrastructure/redis/redis.service";

const REVOKED_TOKEN_PREFIX = "auth:revoked:";
const AUTH_SERVICE_UNAVAILABLE_MESSAGE = "认证服务暂不可用";

@Injectable()
export class AuthRevocationService {
  constructor(private readonly redisService: RedisService) {}

  async revoke(tokenId: string, expiresAt: number): Promise<void> {
    const ttl = Math.max(expiresAt - Math.floor(Date.now() / 1000), 1);

    await this.execute(() =>
      this.redisService.getClient().set(`${REVOKED_TOKEN_PREFIX}${tokenId}`, "1", "EX", ttl),
    );
  }

  async isRevoked(tokenId: string): Promise<boolean> {
    return (
      (await this.execute(() =>
        this.redisService.getClient().exists(`${REVOKED_TOKEN_PREFIX}${tokenId}`),
      )) === 1
    );
  }

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
