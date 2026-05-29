export type CostLevel = "cheap" | "standard" | "premium-only";
export type Complexity = "simple" | "medium" | "complex";

export interface SkillDefinition {
  id: string;
  label: string;
  costLevel: CostLevel;
  complexity: Complexity;
  buildPrompt: (tier: string, context?: any) => string;
  modelOverride?: Record<string, string>;
}

const SKILL_REGISTRY = new Map<string, SkillDefinition>();

export function registerSkill(skill: SkillDefinition): void {
  SKILL_REGISTRY.set(skill.id, skill);
}

export function getSkill(id: string): SkillDefinition | undefined {
  return SKILL_REGISTRY.get(id);
}

export interface SkillRoute {
  skill: SkillDefinition;
  provider: "groq" | "deepseek" | "claude" | "ollama" | "google";
  modelLabel: string;
  systemPrompt: string;
}

export function skillRouter(
  skillId: string,
  userTier: string,
  context?: any
): SkillRoute {
  const skill = getSkill(skillId);
  if (!skill) {
    throw new Error(`Unknown skill: ${skillId}`);
  }

  const { provider, modelLabel } = selectModel(skill, userTier);
  const systemPrompt = skill.buildPrompt(userTier, context);

  return { skill, provider, modelLabel, systemPrompt };
}

function selectModel(
  skill: SkillDefinition,
  userTier: string
): { provider: "groq" | "deepseek" | "claude" | "ollama" | "google"; modelLabel: string } {
  // Explicit override a skill-ben (pl. site-builder: free→groq, pro→deepseek, premium→claude)
  if (skill.modelOverride?.[userTier]) {
    const mapped = skill.modelOverride[userTier];
    return parseModelMapping(mapped);
  }

  // Költség-alapú default routing
  switch (skill.costLevel) {
    case "cheap":
      return { provider: "groq", modelLabel: "groq-llama-3.3-70b" };

    case "standard":
      switch (userTier) {
        case "free":
          return { provider: "google", modelLabel: "gemini-2.5-flash" };
        case "pro":
          return { provider: "deepseek", modelLabel: "deepseek-v4-flash" };
        case "premium":
          return { provider: "claude", modelLabel: "claude-sonnet-4-6" };
        default:
          return { provider: "groq", modelLabel: "groq-llama-3.3-70b" };
      }

    case "premium-only":
      if (userTier !== "premium") {
        throw new Error(`Skill "${skill.id}" requires premium tier`);
      }
      return { provider: "claude", modelLabel: "claude-sonnet-4-6" };
  }
}

function parseModelMapping(mapping: string): { provider: "groq" | "deepseek" | "claude" | "ollama" | "google"; modelLabel: string } {
  const [provider, ...rest] = mapping.split(":");
  const modelLabel = rest.join(":");
  return {
    provider: provider as any,
    modelLabel: modelLabel || `${provider}-default`,
  };
}
