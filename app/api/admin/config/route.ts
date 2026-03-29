import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  knowledgeBaseUrl: z.string().optional(),
  additionalGuidelines: z.string().optional(),
  systemPrompt: z.string().optional(),
});

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }
  try {
    const bots = await getDb().botConfig.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ bots });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}

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

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { id, ...rest } = parsed.data;
  const data = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined)
  ) as Record<string, string>;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Provide at least one field to update" },
      { status: 400 }
    );
  }

  try {
    const updated = await getDb().botConfig.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, bot: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
