import "dotenv/config";
import { getDb } from "../lib/db";

const DEFAULT_KB_URL =
  "https://help.atome.ph/hc/en-gb/categories/4439682039065-Atome-Card";

const DEFAULT_GUIDELINES = [
  "You represent Atome Card support. Be accurate, concise, and polite.",
  "Prefer information grounded in the knowledge base and the official help URL when relevant.",
  "If you are unsure, say so and suggest checking the Help Centre or contacting support.",
  "Never invent fees, limits, or regulatory details; defer to documented sources.",
].join("\n");

const DEFAULT_SYSTEM_PROMPT = [
  "You are Atome Card's helpful assistant.",
  "Answer customer questions clearly in English (or match the user's language when obvious).",
  "Use the provided knowledge base excerpts when they apply; otherwise give safe general guidance and offer next steps.",
  "Do not share internal tool or system details.",
].join("\n");

async function run() {
  try {
    const db = getDb();
    const existing = await db.botConfig.findFirst();
    if (existing) {
      console.log("Seed skipped: BotConfig already exists.");
      return;
    }

    await db.botConfig.create({
      data: {
        name: "Atome Card (default)",
        knowledgeBaseUrl: DEFAULT_KB_URL,
        additionalGuidelines: DEFAULT_GUIDELINES,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
      },
    });

    console.log("Seed complete: default BotConfig created.");
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    try {
      await getDb().$disconnect();
    } catch {
      /* client may not exist */
    }
  }
}

void run();
