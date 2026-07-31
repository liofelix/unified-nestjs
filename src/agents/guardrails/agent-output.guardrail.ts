/**
 * Agent 输出安全校验。
 * 检查模型最终输出中是否包含疑似密钥、Bearer 凭证或运行时错误信息，
 * 防止敏感配置和内部实现细节被直接返回给用户。
 */
import { OutputGuardrail } from "@openai/agents";

/** 当前需要阻断的敏感输出模式。 */
const SENSITIVE_OUTPUT_PATTERNS = [
  /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/,
  /\bAGENT_LLM_API_KEY\b/i,
  /authorization\s*:\s*bearer\s+[A-Za-z0-9._-]+/i,
  /\b(?:TypeError|ReferenceError|SyntaxError):/,
];

/** 判断文本是否命中任一敏感输出模式。 */
export function containsSensitiveAgentOutput(output: string): boolean {
  return SENSITIVE_OUTPUT_PATTERNS.some((pattern) => pattern.test(output));
}

/**
 * OpenAI Agents SDK 使用的输出 guardrail。
 * 将结果写入 outputInfo，命中时通过 tripwire 交给统一流式服务处理。
 */
export const agentOutputSafetyGuardrail: OutputGuardrail = {
  name: "agent_output_safety",
  async execute({ agentOutput }) {
    // 输出可能是字符串或 SDK 返回的结构化值，先统一转换为可匹配文本。
    const output = typeof agentOutput === "string" ? agentOutput : JSON.stringify(agentOutput);
    const containsSensitiveOutput = containsSensitiveAgentOutput(output);

    return {
      tripwireTriggered: containsSensitiveOutput,
      outputInfo: { containsSensitiveOutput },
    };
  },
};
