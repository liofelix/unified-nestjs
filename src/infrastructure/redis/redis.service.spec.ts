/**
 * Redis 生命周期服务单元测试。
 * 使用假的 ioredis 客户端验证配置读取、就绪状态和连接销毁流程。
 */
import { vi } from "vitest";

const redisInstances = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock("ioredis", () => ({
  default: class MockRedis {
    status = "wait";
    on = vi.fn(() => this);
    connect = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn();

    constructor(url: string, options: Record<string, unknown>) {
      redisInstances.push({ instance: this, url, options });
    }
  },
}));

import type { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";
import { RedisService } from "./redis.service";

describe("RedisService", () => {
  it("创建懒连接客户端并管理生命周期", () => {
    redisInstances.length = 0;
    const configService = {
      getOrThrow: vi.fn().mockReturnValue("redis://test"),
    } as unknown as ConfigService;

    const service = new RedisService(configService);
    const record = redisInstances[0];
    const client = record?.instance as {
      status: string;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    };

    expect(record?.url).toBe("redis://test");
    expect(record?.options).toMatchObject({ lazyConnect: true, enableOfflineQueue: false });
    expect(service.getClient()).toBe(client);
    expect(service.isReady).toBe(false);

    service.onModuleInit();
    expect(client.connect).toHaveBeenCalledTimes(1);

    client.status = "ready";
    expect(service.isReady).toBe(true);

    service.onModuleDestroy();
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });
});
