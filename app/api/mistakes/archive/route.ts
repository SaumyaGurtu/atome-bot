import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  id: z.string().min(1).optional(),
  ids: z.array(z.string().min(1)).optional(),
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

  const ids =
    parsed.data.ids?.length ? parsed.data.ids : parsed.data.id ? [parsed.data.id] : [];

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Provide id or ids" },
      { status: 400 }
    );
  }

  try {
    await getDb().mistakeReport.updateMany({
      where: { id: { in: ids } },
      data: { status: "archived" },
    });
    return NextResponse.json({ ok: true, archived: ids.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to archive" }, { status: 500 });
  }
}
