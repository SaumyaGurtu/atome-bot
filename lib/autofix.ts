import type { CorrectionRule } from "@/app/generated/prisma/client";
import { getDb } from "@/lib/db";
import {
  detectApplicationStatusIntent,
  detectFailedTransactionIntent,
} from "@/lib/intents";

/** Heuristic mistake taxonomy for routing fixes. */
export type ProblemType =
  | "tool_routing"
  | "answer_correction"
  | "general_inaccuracy";

const PROBLEM_TYPES: ProblemType[] = [
  "tool_routing",
  "answer_correction",
  "general_inaccuracy",
];

export function coerceProblemType(
  value: string | undefined,
  fallback: ProblemType
): ProblemType {
  if (value && PROBLEM_TYPES.includes(value as ProblemType)) {
    return value as ProblemType;
  }
  return fallback;
}

export type GenerateCorrectionRuleInput = {
  botConfigId: string;
  userQuestion: string;
  botAnswer: string;
  userFeedback: string;
  correctedAnswer?: string | null;
  fixSummary?: string | null;
};

/** Pull searchable keywords from free text (MVP tokenizer). */
function keywordTriggerFromText(text: string, maxTokens = 14): string {
  const words = text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  return [...new Set(words)].slice(0, maxTokens).join(" ");
}

export function classifyMistakeProblem(
  input: GenerateCorrectionRuleInput
): ProblemType {
  const q = `${input.userQuestion} ${input.userFeedback}`.toLowerCase();

  if (
    detectFailedTransactionIntent(input.userQuestion) ||
    detectFailedTransactionIntent(input.userFeedback)
  ) {
    return "tool_routing";
  }

  if (
    detectApplicationStatusIntent(input.userQuestion) ||
    detectApplicationStatusIntent(input.userFeedback)
  ) {
    return "tool_routing";
  }

  if (input.correctedAnswer?.trim()) {
    return "answer_correction";
  }

  if (
    /\b(wrong|incorrect|not\s+true|bad\s+answer|hallucinat|made\s+up)\b/.test(q)
  ) {
    return "general_inaccuracy";
  }

  return "general_inaccuracy";
}

function buildRuleFields(
  problemType: ProblemType,
  input: GenerateCorrectionRuleInput
): {
  triggerPattern: string;
  issueDescription: string;
  correctedGuidance: string;
} {
  if (problemType === "tool_routing") {
    if (
      detectFailedTransactionIntent(input.userQuestion) ||
      detectFailedTransactionIntent(input.userFeedback)
    ) {
      return {
        triggerPattern:
          "transaction payment failed pay charge declined purchase order checkout refund",
        issueDescription:
          "[tool_routing] Failed transaction / payment: collect transaction ID before specifics.",
        correctedGuidance:
          "When the user describes a failed or declined payment or transaction, ask for their transaction reference ID (at least 6 alphanumeric characters) before stating a specific outcome. Then you may use get_transaction_status with that ID (demo data).",
      };
    }

    return {
      triggerPattern:
        "application apply applying status approved declined pending review card",
      issueDescription:
        "[tool_routing] Application status: never guess; use the status tool.",
      correctedGuidance:
        "When the user asks about application or card application status, do not invent a status. Use get_application_status with applicationId or email when possible (demo data).",
    };
  }

  if (problemType === "answer_correction" && input.correctedAnswer?.trim()) {
    return {
      triggerPattern: keywordTriggerFromText(input.userQuestion),
      issueDescription:
        "[answer_correction] User supplied a preferred factual answer for similar questions.",
      correctedGuidance: `For questions similar to this topic, prefer this corrected information:\n${input.correctedAnswer.trim()}`,
    };
  }

  const hint =
    input.fixSummary?.trim() ||
    input.userFeedback.trim().slice(0, 400) ||
    "Be conservative; verify against the knowledge base.";

  return {
    triggerPattern: keywordTriggerFromText(
      `${input.userQuestion} ${input.userFeedback}`
    ),
    issueDescription:
      "[general_inaccuracy] User reported a factual or quality issue.",
    correctedGuidance: input.correctedAnswer?.trim()
      ? `Prefer this when similar questions arise:\n${input.correctedAnswer.trim()}`
      : `Double-check facts against the knowledge base. Context from the user: ${hint}`,
  };
}

/**
 * Classify a mistake, build a simple correction rule, and persist it.
 * Pass `problemType` when you already classified (e.g. after saving the report).
 */
export async function generateCorrectionRule(
  input: GenerateCorrectionRuleInput,
  problemType?: ProblemType
): Promise<{ problemType: ProblemType; rule: CorrectionRule }> {
  const pt = problemType ?? classifyMistakeProblem(input);
  const fields = buildRuleFields(pt, input);

  const rule = await getDb().correctionRule.create({
    data: {
      botConfigId: input.botConfigId,
      triggerPattern: fields.triggerPattern,
      issueDescription: fields.issueDescription,
      correctedGuidance: fields.correctedGuidance,
      active: true,
    },
  });

  return { problemType: pt, rule };
}

/** True if any trigger token (length ≥ 3) appears in the query. */
function matchesTrigger(query: string, triggerPattern: string): boolean {
  const q = query.toLowerCase();
  const tokens = triggerPattern
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  if (tokens.length === 0) return false;
  return tokens.some((t) => q.includes(t));
}

/**
 * Active rules for this bot whose trigger keywords overlap the user query.
 */
export async function getRelevantCorrectionRules(
  botConfigId: string,
  query: string
): Promise<CorrectionRule[]> {
  const rules = await getDb().correctionRule.findMany({
    where: { botConfigId, active: true },
    orderBy: { createdAt: "desc" },
  });

  return rules.filter((r: { triggerPattern: string }) => matchesTrigger(query, r.triggerPattern));
}

/** Compact block for system prompts (demo). */
export function formatCorrectionRulesForPrompt(rules: CorrectionRule[]): string {
  if (rules.length === 0) return "";
  const lines = rules.map(
    (r, i) => `${i + 1}. ${r.correctedGuidance}`
  );
  return `Active correction rules (apply when relevant):\n${lines.join("\n")}`;
}
