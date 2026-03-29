export type ComplexityTier = "simple" | "standard" | "complex";

interface ClassificationInput {
  prompt: string;
  taskType?: string;
  contextLength?: number;
}

const SIMPLE_TASK_TYPES = new Set([
  "faq",
  "formatting",
  "summarization",
  "translation",
  "extraction",
]);

const COMPLEX_TASK_TYPES = new Set([
  "architecture",
  "strategy",
  "reasoning",
  "multi-step",
  "code-review",
]);

export function classifyComplexity(input: ClassificationInput): ComplexityTier {
  if (input.taskType) {
    if (SIMPLE_TASK_TYPES.has(input.taskType)) return "simple";
    if (COMPLEX_TASK_TYPES.has(input.taskType)) return "complex";
  }

  const promptLength = input.prompt.length;
  const contextLength = input.contextLength ?? 0;
  const totalLength = promptLength + contextLength;

  if (totalLength < 500) return "simple";
  if (totalLength > 5000) return "complex";

  const complexIndicators = [
    /\b(analyze|architect|design|compare|evaluate|synthesize)\b/i,
    /\b(step by step|multi-?step|comprehensive|thorough|detailed)\b/i,
    /\b(trade-?offs?|pros?\s+and\s+cons?|advantages?\s+and\s+disadvantages?)\b/i,
  ];

  const matches = complexIndicators.filter((r) => r.test(input.prompt)).length;
  if (matches >= 2) return "complex";

  return "standard";
}

export const TIER_MODELS: Record<ComplexityTier, Record<string, string>> = {
  simple: {
    anthropic: "claude-3-5-haiku-20241022",
    openai: "gpt-4o-mini",
    google: "gemini-2.0-flash",
  },
  standard: {
    anthropic: "claude-sonnet-4-20250514",
    openai: "gpt-4o",
    google: "gemini-2.5-pro-preview-05-06",
  },
  complex: {
    anthropic: "claude-3-opus-20240229",
    openai: "gpt-4.5-preview",
    google: "gemini-2.5-pro-preview-05-06",
  },
};
