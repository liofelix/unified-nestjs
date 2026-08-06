/**
 * Agent 目录查询接口。
 * 对外提供当前已注册 Agent 的展示元数据，不直接暴露模型执行细节。
 */
import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AgentsRegistry } from "./agents.registry";

/** 处理 Agent 列表查询请求的控制器。 */
@ApiTags("Agent")
@ApiBearerAuth()
@Controller("agents")
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class AgentsController {
  /** 注入注册表，确保接口返回的 Agent 与实际可用实例保持一致。 */
  constructor(private readonly agentsRegistry: AgentsRegistry) {}

  /** 返回所有已注册 Agent 的 code、名称和用途描述。 */
  @Get()
  list() {
    return this.agentsRegistry.list();
  }
}
