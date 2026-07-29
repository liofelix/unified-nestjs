import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

const REVOKED_TOKEN_PREFIX = "auth:revoked:";
const AUTH_SERVICE_UNAVAILABLE_MESSAGE = "认证服务暂不可用";

@Injectable()
export class AuthTokenService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: Redis;

  constructor(configService: ConfigService) {
    this.redis = new Redis(configService.getOrThrow<string>("REDIS_URL"), {
      lazyConnect: true,
      enableOfflineQueue: false,
      autoResendUnfulfilledCommands: false,
      maxRetriesPerRequest: 1,
    });
    this.redis.on("error", () => undefined);
  }

  onModuleInit(): void {
    void this.redis.connect().catch(() => undefined);
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }

  async revoke(tokenId: string, expiresAt: number): Promise<void> {
    const ttl = Math.max(expiresAt - Math.floor(Date.now() / 1000), 1);

    await this.execute(() => this.redis.set(`${REVOKED_TOKEN_PREFIX}${tokenId}`, "1", "EX", ttl));
  }

  async isRevoked(tokenId: string): Promise<boolean> {
    return (await this.execute(() => this.redis.exists(`${REVOKED_TOKEN_PREFIX}${tokenId}`))) === 1;
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.redis.status !== "ready") {
      throw new ServiceUnavailableException(AUTH_SERVICE_UNAVAILABLE_MESSAGE);
    }

    try {
      return await operation();
    } catch {
      throw new ServiceUnavailableException(AUTH_SERVICE_UNAVAILABLE_MESSAGE);
    }
  }
}
