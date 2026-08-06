/**
 * 天气 Agent 实现。
 * 负责把天气指令、天气工具和输入输出安全校验组装成具体 Agent，
 * 再交给统一流式服务执行当前、今天或明天的天气咨询。
 */
import { Injectable } from "@nestjs/common";
import { Agent } from "@openai/agents";
import type { AgentStreamInput, ChatAgent } from "../../agents.types";
import { AgentsStreamingService } from "../../agents-streaming.service";
import { AGENT_INPUT_SAFETY_GUARDRAIL } from "../../guardrails/agent-input.guardrail";
import { AGENT_OUTPUT_SAFETY_GUARDRAIL } from "../../guardrails/agent-output.guardrail";
import { WeatherToolsFactory } from "../../tools/weather/weather-tools.factory";

/**
 * 天气 Agent 的系统指令：限定可处理的时间范围、事实来源和回答格式。
 * 天气事实必须通过工具获取，避免模型依赖训练数据或自行猜测天气。
 */
const WEATHER_AGENT_INSTRUCTIONS = `你是天气助手，只能回答当前、今天和明天的天气问题。
任何需要天气事实的数据都必须调用提供的天气工具，不能依赖自身知识或编造数据。
如果用户未提供可识别的城市，先用中文要求其补充城市名称；当工具无法找到城市时，说明情况并请用户补充国家或地区。
回答使用中文，简洁列出地点、天气现象、温度、降水和风力。`;

/**
 * 天气领域的 ChatAgent 适配器。
 *
 * 该服务本身不直接请求天气 API，而是负责把天气工具、安全校验和模型指令
 * 组装成可运行的 Agent，并将会话流式执行委托给统一的流式服务。
 */
@Injectable()
export class WeatherAgentService implements ChatAgent {
  /** 提供给 Agent 注册表和前端 Agent 列表使用的稳定标识及展示信息。 */
  readonly metadata = {
    code: "weather",
    name: "天气助手",
    description: "查询当前、今天和明天的天气",
  };

  /** 延迟创建并跨请求复用的天气 Agent 实例。 */
  private agent?: Agent;

  /**
   * 注入统一流式执行器和天气工具工厂。
   * 工具工厂按每次创建 Agent 时生成可调用的天气查询工具，避免在此处耦合具体 API。
   */
  constructor(
    private readonly agentsStreamingService: AgentsStreamingService,
    private readonly weatherToolsFactory: WeatherToolsFactory,
  ) {}

  /**
   * 执行一次天气对话并逐段返回模型输出。
   * 历史消息和取消信号都交由统一流式服务处理，当前服务只负责提供天气 Agent。
   */
  stream(input: AgentStreamInput): AsyncIterable<string> {
    return this.agentsStreamingService.stream(this.createAgent(), input);
  }

  /**
   * 创建 OpenAI Agent 运行时实例。
   *
   * 实例包含天气查询工具、天气范围与回答规范，以及输入和输出两侧的安全 guardrail；
   * Agent 和工具列表在首次使用时组装，后续请求复用同一实例。
   */
  createAgent(): Agent {
    if (this.agent) {
      return this.agent;
    }

    this.agent = new Agent({
      name: this.metadata.name,
      instructions: WEATHER_AGENT_INSTRUCTIONS,
      tools: this.weatherToolsFactory.create(),
      inputGuardrails: [AGENT_INPUT_SAFETY_GUARDRAIL],
      outputGuardrails: [AGENT_OUTPUT_SAFETY_GUARDRAIL],
    });

    return this.agent;
  }
}
