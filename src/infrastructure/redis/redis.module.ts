/**
 * Redis 基础设施模块。
 * 创建并导出 RedisService，供认证令牌撤销等跨领域功能复用。
 */
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisService } from "./redis.service";

/** Redis 客户端依赖的 NestJS 模块。 */
@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
