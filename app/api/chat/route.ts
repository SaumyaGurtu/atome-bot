import { NextResponse } from "next/server";
import { chatBodySchema, runCustomerChat } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = chatBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const result = await runCustomerChat(parsed.data);
    return NextResponse.json({
      message: result.message,
      usage: result.usage,
      retrievedChunkIds: result.retrievedChunkIds,
      intent: result.intent,
      sources: result.sources,
      usedTool: result.usedTool,
      trace: result.trace,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Chat request failed" },
      { status: 502 }
    );
  }
}
