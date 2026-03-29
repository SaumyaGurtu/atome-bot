import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { generateAgentProfile } from "@/lib/meta-agent";

export const runtime = "nodejs";

const bodySchema = z.object({
  instruction: z.string().min(1),
  fileName: z.string().optional(),
  rawText: z.string().optional(),
});

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
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

  try {
    const profile = await generateAgentProfile(
      parsed.data.instruction,
      parsed.data.rawText
    );

    const doc = await getDb().uploadedDocument.create({
      data: {
        botConfigId: null,
        fileName: parsed.data.fileName?.trim() || "uploaded-doc.txt",
        rawText: parsed.data.rawText?.trim()
          ? parsed.data.rawText
          : JSON.stringify(profile, null, 2),
      },
    });

    return NextResponse.json({
      id: doc.id,
      profile,
      documentId: doc.id,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to generate agent" },
      { status: 502 }
    );
  }
}