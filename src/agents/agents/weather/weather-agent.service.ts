import { Injectable } from "@nestjs/common";
import { Agent } from "@openai/agents";
import { AgentStreamInput, ChatAgent } from "../../agents.types";
import { AgentsStreamingService } from "../../agents-streaming.service";
import { agentInputSafetyGuardrail } from "../../guardrails/agent-input.guardrail";
import { agentOutputSafetyGuardrail } from "../../guardrails/agent-output.guardrail";
import { WeatherToolsFactory } from "../../tools/weather/weather-tools.factory";

const WEATHER_AGENT_INSTRUCTIONS = `你是天气助手，只能回答当前、今天和明天的天气问题。
任何需要天气事实的数据都必须调用提供的天气工具，不能依赖自身知识或编造数据。
如果用户未提供可识别的城市，先用中文要求其补充城市名称；当工具无法找到城市时，说明情况并请用户补充国家或地区。
回答使用中文，简洁列出地点、天气现象、温度、降水和风力。`;

@Injectable()
export class WeatherAgentService implements ChatAgent {
  readonly metadata = {
    code: "weather",
    name: "天气助手",
    description: "查询当前、今天和明天的天气",
  };

  constructor(
    private readonly agentsStreamingService: AgentsStreamingService,
    private readonly weatherToolsFactory: WeatherToolsFactory,
  ) {}

  stream(input: AgentStreamInput): AsyncIterable<string> {
    return this.agentsStreamingService.stream(this.createAgent(), input);
  }

  createAgent(): Agent {
    return new Agent({
      name: this.metadata.name,
      instructions: WEATHER_AGENT_INSTRUCTIONS,
      tools: this.weatherToolsFactory.create(),
      inputGuardrails: [agentInputSafetyGuardrail],
      outputGuardrails: [agentOutputSafetyGuardrail],
    });
  }
}
