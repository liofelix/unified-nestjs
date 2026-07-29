import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;

  constructor(configService: ConfigService) {
    this.client = new Redis(configService.getOrThrow<string>("REDIS_URL"), {
      lazyConnect: true,
      enableOfflineQueue: false,
      autoResendUnfulfilledCommands: false,
      maxRetriesPerRequest: 1,
    });
    this.client.on("error", () => undefined);
  }

  get isReady(): boolean {
    return this.client.status === "ready";
  }

  getClient(): Redis {
    return this.client;
  }

  onModuleInit(): void {
    void this.client.connect().catch(() => undefined);
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
