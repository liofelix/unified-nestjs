import { OutputGuardrail } from "@openai/agents";

const SENSITIVE_OUTPUT_PATTERNS = [
  /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/,
  /\bAGENT_LLM_API_KEY\b/i,
  /authorization\s*:\s*bearer\s+[A-Za-z0-9._-]+/i,
  /\b(?:TypeError|ReferenceError|SyntaxError):/,
];

export function containsSensitiveAgentOutput(output: string): boolean {
  return SENSITIVE_OUTPUT_PATTERNS.some((pattern) => pattern.test(output));
}

export const agentOutputSafetyGuardrail: OutputGuardrail = {
  name: "agent_output_safety",
  async execute({ agentOutput }) {
    const output = typeof agentOutput === "string" ? agentOutput : JSON.stringify(agentOutput);
    const containsSensitiveOutput = containsSensitiveAgentOutput(output);

    return {
      tripwireTriggered: containsSensitiveOutput,
      outputInfo: { containsSensitiveOutput },
    };
  },
};
