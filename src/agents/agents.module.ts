import { Module } from "@nestjs/common";
import { WeatherModule } from "../weather/weather.module";
import { AgentsStreamingService } from "./agents-streaming.service";
import { AgentsRegistry } from "./agents.registry";
import { AgentsController } from "./agents.controller";
import { ChatAgent, CHAT_AGENT_PROVIDERS } from "./agents.types";
import { AgentsRunnerFactory } from "./agents.runner.factory";
import { WeatherAgentService } from "./agents/weather/weather-agent.service";
import { WeatherToolsFactory } from "./tools/weather/weather-tools.factory";

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
