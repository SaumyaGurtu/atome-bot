import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";
import {
  formatCorrectionRulesForPrompt,
  getRelevantCorrectionRules,
} from "@/lib/autofix";
import { getDb } from "@/lib/db";
import {
  type CustomerIntent,
  detectApplicationStatusIntent,
  detectFailedTransactionIntent,
  detectIntent,
  extractTransactionId,
} from "@/lib/intents";
import { prisma } from "@/lib/db";
import { openai } from "@/lib/openai";
import {
  formatChunksForPrompt,
  retrieveRelevantChunks,
  type RankedKnowledgeChunk,
} from "@/lib/retrieval";
import {
  getApplicationStatus,
  getTransactionStatus,
} from "@/lib/tools";

const RAG_MODEL = "gpt-4.1-mini";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

export const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1),
  topK: z.number().int().min(1).max(20).optional(),
  model: z.string().optional(),
});

export type ChatBody = z.infer<typeof chatBodySchema>;

export type RunBotParams = {
  message: string;
  botConfigId?: string;
  /** Lexical retrieval depth (default 5). */
  topK?: number;
};

export type RunBotResult = {
  answer: string;
  sources: Array<{ title: string; url: string }>;
  usedTool?: string;
  trace: { intent: string };
  retrievedChunkIds: string[];
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
};

function getLastUserMessage(messages: ChatBody["messages"]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === "user") return m.content;
  }
  return null;
}

function buildChatMessages(
  systemWithContext: string,
  messages: ChatBody["messages"]
): ChatCompletionMessageParam[] {
  const systemFromUser = messages.filter((m) => m.role === "system");
  const others = messages.filter((m) => m.role !== "system");
  const mergedSystem =
    systemFromUser.length > 0
      ? `${systemWithContext}\n\nAdditional instructions:\n${systemFromUser.map((m) => m.content).join("\n\n")}`
      : systemWithContext;
  return [{ role: "system", content: mergedSystem }, ...others];
}

function extractEmail(text: string): string | undefined {
  const m = text.match(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/);
  return m?.[0];
}

/** Optional explicit application / reference token from user text. */
function extractApplicationIdHint(text: string): string | undefined {
  const m = text.match(
    /\b(?:app(?:lication)?|ref|reference)\s*[:#-]?\s*([A-Za-z0-9-]{6,})\b/i
  );
  return m?.[1];
}

function dedupeSources(chunks: RankedKnowledgeChunk[]): Array<{ title: string; url: string }> {
  const byUrl = new Map<string, { title: string; url: string }>();
  for (const c of chunks) {
    if (!byUrl.has(c.sourceUrl)) {
      byUrl.set(c.sourceUrl, { title: c.title, url: c.sourceUrl });
    }
  }
  return [...byUrl.values()];
}

function isWeakKbContext(chunks: RankedKnowledgeChunk[]): boolean {
  if (chunks.length === 0) return true;
  return chunks.every((c) => c.score <= 0);
}

function buildGroundedInstructions(params: {
  systemPrompt: string;
  additionalGuidelines: string;
  correctionBlock: string;
  kbBlock: string;
  weakKb: boolean;
}): string {
  const parts: string[] = [params.systemPrompt.trim()];

  if (params.additionalGuidelines.trim()) {
    parts.push(`Guidelines:\n${params.additionalGuidelines.trim()}`);
  }
  if (params.correctionBlock.trim()) {
    parts.push(params.correctionBlock.trim());
  }
  if (params.kbBlock.trim()) {
    parts.push(`Knowledge base excerpts:\n${params.kbBlock.trim()}`);
  }

  parts.push(
    params.weakKb
      ? "The excerpts above may be incomplete or not relevant. If you cannot ground the answer in them, say clearly that you are unsure and suggest checking the Help Centre or support. Do not invent fees, limits, or policies."
      : "Ground answers in the excerpts when they apply. If they do not cover the question, say so instead of guessing."
  );

  return parts.join("\n\n");
}

/**
 * Main demo entry: tools first, then grounded RAG + Responses API.
 */
export async function runBot(params: RunBotParams): Promise<RunBotResult> {
  const { message, botConfigId, topK = 5 } = params;

  const bot = botConfigId
    ? await getDb().botConfig.findUnique({ where: { id: botConfigId } })
    : await prisma.botConfig.findFirst();

  if (!bot) {
    return {
      answer:
        "This assistant is not configured yet (no bot profile). Please try again later or contact support.",
      sources: [],
      trace: { intent: "error_no_bot_config" },
      retrievedChunkIds: [],
      usage: null,
    };
  }

  if (detectApplicationStatusIntent(message)) {
    const email = extractEmail(message);
    const applicationId = extractApplicationIdHint(message);
    const tool = getApplicationStatus({
      ...(applicationId !== undefined ? { applicationId } : {}),
      ...(email !== undefined ? { email } : {}),
    });

    return {
      answer: tool.message,
      sources: [],
      usedTool: "getApplicationStatus",
      trace: { intent: "application_status" },
      retrievedChunkIds: [],
      usage: null,
    };
  }

  if (detectFailedTransactionIntent(message)) {
    const transactionId = extractTransactionId(message);
    if (!transactionId) {
      return {
        answer:
          "I can check that for you—please send your transaction reference ID (at least 6 letters or numbers, as shown in your receipt or app).",
        sources: [],
        trace: { intent: "failed_transaction_missing_id" },
        retrievedChunkIds: [],
        usage: null,
      };
    }

    const tool = getTransactionStatus({ transactionId });
    return {
      answer: tool.message,
      sources: [],
      usedTool: "getTransactionStatus",
      trace: { intent: "failed_transaction" },
      retrievedChunkIds: [],
      usage: null,
    };
  }

  const chunks = await retrieveRelevantChunks(bot.id, message, topK);
  const rules = await getRelevantCorrectionRules(bot.id, message);
  const weakKb = isWeakKbContext(chunks);

  const kbBlock =
    chunks.length > 0 ? formatChunksForPrompt(chunks) : "";
  const correctionBlock = formatCorrectionRulesForPrompt(rules);

  const instructions = buildGroundedInstructions({
    systemPrompt: bot.systemPrompt,
    additionalGuidelines: bot.additionalGuidelines,
    correctionBlock,
    kbBlock,
    weakKb,
  });

  let answer: string;
  let usage: RunBotResult["usage"] = null;
  try {
    const response = await openai.responses.create({
      model: RAG_MODEL,
      instructions,
      input: message,
    });

    answer =
      response.output_text?.trim() ||
      "I’m sorry, I couldn’t generate a response right now.";

    usage = response.usage
    ? {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.total_tokens,
      }
    : null;
  } catch (error: any) {
    console.error("OpenAI call failed:", error);

    if (chunks.length > 0) {
      answer =
        `I’m currently running in fallback mode because the LLM API is unavailable. ` +
        `Based on the indexed knowledge base: ${chunks[0].content.slice(0, 300)}...`;
    } else {
      answer =
        "I’m currently running in fallback mode because the LLM API is unavailable, and I do not have enough indexed knowledge to answer confidently.";
    }
  }

  return {
    answer,
    sources: dedupeSources(chunks),
    trace: { intent: "rag" },
    retrievedChunkIds: chunks.map((c) => c.id),
    usage,
  };
}

function legacyIntent(traceIntent: string, message: string): CustomerIntent {
  if (
    traceIntent === "application_status" ||
    traceIntent === "failed_transaction" ||
    traceIntent === "failed_transaction_missing_id"
  ) {
    return "support";
  }
  if (traceIntent === "rag") {
    return detectIntent(message);
  }
  return "general";
}

export type CustomerChatResult = {
  message: string;
  retrievedChunkIds: string[];
  intent: CustomerIntent;
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
  sources?: Array<{ title: string; url: string }>;
  usedTool?: string;
  trace?: { intent: string };
};

/**
 * Multi-turn chat: uses the latest user message with {@link runBot}.
 */
export async function runCustomerChat(
  body: ChatBody
): Promise<CustomerChatResult> {
  const { messages, topK = 5, model: _legacyModel } = body;
  const lastUser = getLastUserMessage(messages);
  if (!lastUser) {
    return {
      message: "",
      retrievedChunkIds: [],
      intent: "general",
      usage: null,
    };
  }

  const out = await runBot({ message: lastUser, topK });

  return {
    message: out.answer,
    retrievedChunkIds: out.retrievedChunkIds,
    intent: legacyIntent(out.trace.intent, lastUser),
    usage: out.usage,
    sources: out.sources,
    usedTool: out.usedTool,
    trace: out.trace,
  };
}

/** @internal — kept if you need chat.completions elsewhere */
export function buildMessagesForLegacyChat(
  systemWithContext: string,
  messages: ChatBody["messages"]
): ChatCompletionMessageParam[] {
  return buildChatMessages(systemWithContext, messages);
}
