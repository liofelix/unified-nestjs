/**
 * Agent 子模块的 NestJS 组装入口。
 * 负责注册 Runner、流式服务、具体 Agent、领域工具和 Agent 注册表，
 * 并向聊天模块导出注册表供会话服务选择 Agent。
 */
import { Module } from "@nestjs/common";
import { WeatherModule } from "../weather/weather.module";
import { AgentsStreamingService } from "./agents-streaming.service";
import { AgentsRegistry } from "./agents.registry";
import { AgentsController } from "./agents.controller";
import { ChatAgent, CHAT_AGENT_PROVIDERS } from "./agents.types";
import { AgentsRunnerFactory } from "./agents-runner.factory";
import { WeatherAgentService } from "./agents/weather/weather-agent.service";
import { WeatherToolsFactory } from "./tools/weather/weather-tools.factory";

/** 集中声明 Agent 相关依赖和 Provider 的 NestJS 模块。 */
@Module({
  imports: [WeatherModule],
  controllers: [AgentsController],
  providers: [
    AgentsRunnerFactory,
    AgentsStreamingService,
    WeatherToolsFactory,
    WeatherAgentService,
    {
      provide: CHAT_AGENT_PROVIDERS,
      useFactory: (weatherAgent: WeatherAgentService): ChatAgent[] => [weatherAgent],
      inject: [WeatherAgentService],
    },
    AgentsRegistry,
  ],
  exports: [AgentsRegistry],
})
export class AgentsModule {}
