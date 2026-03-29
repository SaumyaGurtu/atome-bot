import OpenAI from "openai";

/**
 * Reuse one OpenAI client across hot reloads in `next dev`.
 * Same pattern as `lib/db.ts`; harmless in production.
 */
const globalForOpenAI = globalThis as unknown as {
  openai?: OpenAI;
};

function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

function getOpenAIInstance(): OpenAI {
  if (!globalForOpenAI.openai) {
    globalForOpenAI.openai = createOpenAIClient();
  }
  return globalForOpenAI.openai;
}

/**
 * Shared OpenAI SDK client (chat, embeddings, etc.).
 * Lazily created on first use so `next build` and imports do not require the key at module load.
 * API key is read from `process.env.OPENAI_API_KEY` only — never hard-code secrets.
 */
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getOpenAIInstance();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

/** Same client as `openai` — kept for existing imports. */
export function getOpenAI(): OpenAI {
  return getOpenAIInstance();
}

export const EMBEDDING_MODEL = "text-embedding-3-small" as const;

export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  const vector = res.data[0]?.embedding;
  if (!vector) {
    throw new Error("No embedding returned from OpenAI");
  }
  return vector;
}

export async function embedStrings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
