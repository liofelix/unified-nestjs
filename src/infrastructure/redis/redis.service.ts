/**
 * Redis 客户端生命周期服务。
 * 根据配置创建懒连接客户端，并在模块初始化与销毁时管理连接状态。
 */
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/** 向业务层暴露 Redis 就绪状态和原始客户端。 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  /** 延迟连接的 Redis 客户端实例。 */
  private readonly client: Redis;

  /** 使用配置中的 Redis URL 创建客户端，并关闭离线命令队列。 */
  constructor(configService: ConfigService) {
    this.client = new Redis(configService.getOrThrow<string>("REDIS_URL"), {
      lazyConnect: true,
      enableOfflineQueue: false,
      autoResendUnfulfilledCommands: false,
      maxRetriesPerRequest: 1,
    });
    this.client.on("error", () => undefined);
  }

  /** 当前客户端是否已完成连接并处于 ready 状态。 */
  get isReady(): boolean {
    return this.client.status === "ready";
  }

  /** 返回底层 Redis 客户端，供需要特定命令的服务使用。 */
  getClient(): Redis {
    return this.client;
  }

  /** 模块初始化时尝试建立连接；连接失败由调用方通过就绪状态处理。 */
  onModuleInit(): void {
    void this.client.connect().catch(() => undefined);
  }

  /** 模块销毁时主动断开 Redis 连接。 */
  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
