import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCorrectionRule } from "@/lib/autofix";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  userQuestion: z.string().min(1),
  botAnswer: z.string().min(1),
  userFeedback: z.string().min(1),
  correctedAnswer: z.string().optional(),
});

export async function POST(request: Request) {
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

  const db = getDb();
  const bot = await db.botConfig.findFirst();

  if (!bot) {
    return NextResponse.json(
      { error: "Bot config not found" },
      { status: 404 }
    );
  }

  try {
    const report = await db.mistakeReport.create({
      data: {
        botConfigId: bot.id,
        userQuestion: parsed.data.userQuestion,
        botAnswer: parsed.data.botAnswer,
        userFeedback: parsed.data.userFeedback,
        correctedAnswer: parsed.data.correctedAnswer ?? null,
      },
    });

    const fix = await generateCorrectionRule({
      botConfigId: bot.id,
      userQuestion: parsed.data.userQuestion,
      botAnswer: parsed.data.botAnswer,
      userFeedback: parsed.data.userFeedback,
      correctedAnswer: parsed.data.correctedAnswer ?? null,
    });

    const updated = await db.mistakeReport.update({
      where: { id: report.id },
      data: {
        problemType: fix.problemType,
        fixSummary: fix.fixSummary,
        status: "fixed",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to submit mistake report:", error);
    return NextResponse.json(
      { error: "Failed to submit mistake report" },
      { status: 500 }
    );
  }
}