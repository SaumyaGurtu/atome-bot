import { NextResponse } from "next/server";
import { z } from "zod";
import {
  classifyMistakeProblem,
  coerceProblemType,
  generateCorrectionRule,
} from "@/lib/autofix";
import { getDb } from "@/lib/db";
import { getDefaultBotConfig } from "@/lib/kb";

export const runtime = "nodejs";

const bodySchema = z.object({
  botConfigId: z.string().optional(),
  userQuestion: z.string().min(1),
  botAnswer: z.string().min(1),
  userFeedback: z.string().min(1),
  correctedAnswer: z.string().optional(),
  problemType: z.string().optional(),
  fixSummary: z.string().optional(),
});

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const botConfigId =
    parsed.data.botConfigId ?? (await getDefaultBotConfig())?.id;
  if (!botConfigId) {
    return NextResponse.json(
      { error: "No BotConfig; run prisma db seed" },
      { status: 400 }
    );
  }

  try {
    const ruleInput = {
      botConfigId,
      userQuestion: parsed.data.userQuestion,
      botAnswer: parsed.data.botAnswer,
      userFeedback: parsed.data.userFeedback,
      correctedAnswer: parsed.data.correctedAnswer ?? null,
      fixSummary: parsed.data.fixSummary ?? null,
    };

    const problemType = coerceProblemType(
      parsed.data.problemType,
      classifyMistakeProblem(ruleInput)
    );

    const row = await getDb().mistakeReport.create({
      data: {
        botConfigId,
        userQuestion: parsed.data.userQuestion,
        botAnswer: parsed.data.botAnswer,
        userFeedback: parsed.data.userFeedback,
        correctedAnswer: parsed.data.correctedAnswer ?? null,
        problemType,
        fixSummary: parsed.data.fixSummary ?? null,
        status: "open",
      },
    });

    const { rule } = await generateCorrectionRule(ruleInput, problemType);

    return NextResponse.json({
      id: row.id,
      problemType,
      correctionRuleId: rule.id,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}
