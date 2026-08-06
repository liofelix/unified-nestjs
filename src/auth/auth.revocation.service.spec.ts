/**
 * 令牌撤销服务单元测试。
 * 验证 TTL 计算、Redis 查询和底层故障到 503 的异常映射。
 */
import { ServiceUnavailableException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthRevocationService } from "./auth.revocation.service";

describe("AuthRevocationService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("按令牌剩余有效期写入撤销标记", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_700_000_000_000));
    const client = { set: vi.fn().mockResolvedValue("OK"), exists: vi.fn() };
    const service = new AuthRevocationService({ isReady: true, getClient: () => client } as never);

    await service.revoke("jti-1", 1_700_000_120);

    expect(client.set).toHaveBeenCalledWith("auth:revoked:jti-1", "1", "EX", 120);
  });

  it("过期时间已到时仍使用最小 TTL 1 秒", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_700_000_000_000));
    const client = { set: vi.fn().mockResolvedValue("OK"), exists: vi.fn() };
    const service = new AuthRevocationService({ isReady: true, getClient: () => client } as never);

    await service.revoke("jti-1", 1_699_999_999);

    expect(client.set).toHaveBeenCalledWith("auth:revoked:jti-1", "1", "EX", 1);
  });

  it("查询撤销状态并把 Redis 故障映射为服务不可用", async () => {
    const client = { set: vi.fn(), exists: vi.fn().mockResolvedValue(1) };
    const service = new AuthRevocationService({ isReady: true, getClient: () => client } as never);

    await expect(service.isRevoked("jti-1")).resolves.toBe(true);
    expect(client.exists).toHaveBeenCalledWith("auth:revoked:jti-1");

    client.exists.mockRejectedValueOnce(new Error("redis down"));
    await expect(service.isRevoked("jti-2")).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("Redis 未就绪时拒绝执行操作", async () => {
    const service = new AuthRevocationService({ isReady: false, getClient: vi.fn() } as never);

    await expect(service.isRevoked("jti-1")).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
