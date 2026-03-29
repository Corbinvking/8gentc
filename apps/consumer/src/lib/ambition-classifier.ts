const COMPLEXITY_KEYWORDS = [
  "build",
  "create",
  "develop",
  "launch",
  "design",
  "architect",
  "implement",
  "deploy",
  "integrate",
  "migrate",
  "refactor",
  "scale",
  "optimize",
  "automate",
  "orchestrate",
] as const;

const MULTI_DOMAIN_SIGNALS = [
  "frontend",
  "backend",
  "database",
  "api",
  "devops",
  "infrastructure",
  "ci/cd",
  "mobile",
  "desktop",
  "machine learning",
  "data pipeline",
  "security",
  "authentication",
  "payments",
  "analytics",
  "monitoring",
  "testing",
] as const;

const HUMAN_JUDGMENT_SIGNALS = [
  "review",
  "evaluate",
  "decide",
  "strategy",
  "brand",
  "ux",
  "user research",
  "competitive analysis",
  "market",
  "negotiate",
  "hire",
  "interview",
  "legal",
  "compliance",
] as const;

export interface AmbitionScore {
  score: number;
  dimensions: {
    descriptionLength: number;
    keywordDensity: number;
    domainComplexity: number;
    humanJudgmentRequired: number;
    estimatedTokenCost: number;
  };
  exceedsThreshold: boolean;
  suggestedPlan: "individual" | "pro" | "enterprise";
  reasoning: string;
}

export function scoreAmbition(
  title: string,
  description: string
): AmbitionScore {
  const fullText = `${title} ${description}`.toLowerCase();
  const wordCount = fullText.split(/\s+/).length;

  const descriptionLength = Math.min(wordCount / 200, 1);

  const matchedKeywords = COMPLEXITY_KEYWORDS.filter((kw) =>
    fullText.includes(kw)
  );
  const keywordDensity = Math.min(matchedKeywords.length / 5, 1);

  const matchedDomains = MULTI_DOMAIN_SIGNALS.filter((d) =>
    fullText.includes(d)
  );
  const domainComplexity = Math.min(matchedDomains.length / 3, 1);

  const matchedHumanSignals = HUMAN_JUDGMENT_SIGNALS.filter((s) =>
    fullText.includes(s)
  );
  const humanJudgmentRequired = Math.min(matchedHumanSignals.length / 2, 1);

  const estimatedTokens = wordCount * 150;
  const estimatedTokenCost = Math.min(estimatedTokens / 500_000, 1);

  const weights = {
    descriptionLength: 0.15,
    keywordDensity: 0.25,
    domainComplexity: 0.3,
    humanJudgmentRequired: 0.2,
    estimatedTokenCost: 0.1,
  };

  const score =
    descriptionLength * weights.descriptionLength +
    keywordDensity * weights.keywordDensity +
    domainComplexity * weights.domainComplexity +
    humanJudgmentRequired * weights.humanJudgmentRequired +
    estimatedTokenCost * weights.estimatedTokenCost;

  const reasoning = buildReasoning(
    score,
    matchedKeywords,
    matchedDomains,
    matchedHumanSignals,
    wordCount
  );

  let suggestedPlan: "individual" | "pro" | "enterprise";
  if (score >= 0.7) {
    suggestedPlan = "enterprise";
  } else if (score >= 0.4) {
    suggestedPlan = "pro";
  } else {
    suggestedPlan = "individual";
  }

  return {
    score: Math.round(score * 100) / 100,
    dimensions: {
      descriptionLength: Math.round(descriptionLength * 100) / 100,
      keywordDensity: Math.round(keywordDensity * 100) / 100,
      domainComplexity: Math.round(domainComplexity * 100) / 100,
      humanJudgmentRequired: Math.round(humanJudgmentRequired * 100) / 100,
      estimatedTokenCost: Math.round(estimatedTokenCost * 100) / 100,
    },
    exceedsThreshold: score >= 0.5,
    suggestedPlan,
    reasoning,
  };
}

function buildReasoning(
  score: number,
  keywords: string[],
  domains: string[],
  humanSignals: string[],
  wordCount: number
): string {
  const parts: string[] = [];

  if (score < 0.3) {
    parts.push("This task is within typical AI agent capability.");
  } else if (score < 0.5) {
    parts.push("This task has moderate complexity.");
  } else if (score < 0.7) {
    parts.push(
      "This task is complex and may benefit from human contractor support."
    );
  } else {
    parts.push(
      "This task is highly ambitious and strongly recommended for the contractor fleet."
    );
  }

  if (keywords.length > 0) {
    parts.push(
      `Detected ${keywords.length} complexity signal${keywords.length > 1 ? "s" : ""}: ${keywords.slice(0, 4).join(", ")}.`
    );
  }

  if (domains.length >= 2) {
    parts.push(
      `Spans ${domains.length} domain${domains.length > 1 ? "s" : ""}: ${domains.slice(0, 3).join(", ")}.`
    );
  }

  if (humanSignals.length > 0) {
    parts.push(
      `Requires human judgment for: ${humanSignals.slice(0, 3).join(", ")}.`
    );
  }

  if (wordCount > 100) {
    parts.push(`Detailed specification (${wordCount} words).`);
  }

  return parts.join(" ");
}
