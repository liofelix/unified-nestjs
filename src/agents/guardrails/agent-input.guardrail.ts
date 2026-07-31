/**
 * Agent 输入安全校验。
 * 在模型执行前限制输入长度，并拦截常见的中英文 Prompt Injection 请求。
 */
import { InputGuardrail } from "@openai/agents";

/** 单次 Agent 输入允许的最大字符数。 */
const MAX_AGENT_INPUT_LENGTH = 100_000;

/** 用于识别要求忽略指令或泄露系统提示的中英文模式。 */
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts?)/i,
  /(?:reveal|show|print|export)\s+(?:the\s+)?(?:system|developer)\s+(?:prompt|message|instructions?)/i,
  /忽略(?:之前|以上|所有)?的?(?:指令|提示)/,
  /(?:展示|泄露|输出)(?:系统|开发者)(?:提示词|消息|指令)/,
];

/** 输入安全校验可以报告的违规类型；null 表示未发现违规。 */
export type AgentInputSafetyViolation = "input_too_long" | "prompt_injection" | null;

/** 返回输入过长、疑似 Prompt Injection 或通过校验的结果。 */
export function findAgentInputSafetyViolation(input: string): AgentInputSafetyViolation {
  if (input.length > MAX_AGENT_INPUT_LENGTH) {
    return "input_too_long";
  }

  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(input))
    ? "prompt_injection"
    : null;
}

/**
 * OpenAI Agents SDK 使用的输入 guardrail。
 * 触发违规时设置 tripwire，统一由流式服务转换为客户端可理解的错误。
 */
export const AGENT_INPUT_SAFETY_GUARDRAIL: InputGuardrail = {
  name: "agent_input_safety",
  runInParallel: false,
  async execute({ input }) {
    // SDK 输入可能是字符串或结构化值，统一序列化后复用同一套检测规则。
    const violation = findAgentInputSafetyViolation(
      typeof input === "string" ? input : JSON.stringify(input),
    );

    return {
      tripwireTriggered: violation !== null,
      outputInfo: violation ? { violation } : undefined,
    };
  },
};
