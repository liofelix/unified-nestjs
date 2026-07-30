import { InputGuardrail } from "@openai/agents";

const MAX_AGENT_INPUT_LENGTH = 100_000;
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts?)/i,
  /(?:reveal|show|print|export)\s+(?:the\s+)?(?:system|developer)\s+(?:prompt|message|instructions?)/i,
  /忽略(?:之前|以上|所有)?的?(?:指令|提示)/,
  /(?:展示|泄露|输出)(?:系统|开发者)(?:提示词|消息|指令)/,
];

export type AgentInputSafetyViolation = "input_too_long" | "prompt_injection" | null;

export function findAgentInputSafetyViolation(input: string): AgentInputSafetyViolation {
  if (input.length > MAX_AGENT_INPUT_LENGTH) {
    return "input_too_long";
  }

  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(input))
    ? "prompt_injection"
    : null;
}

export const agentInputSafetyGuardrail: InputGuardrail = {
  name: "agent_input_safety",
  runInParallel: false,
  async execute({ input }) {
    const violation = findAgentInputSafetyViolation(
      typeof input === "string" ? input : JSON.stringify(input),
    );

    return {
      tripwireTriggered: violation !== null,
      outputInfo: violation ? { violation } : undefined,
    };
  },
};
