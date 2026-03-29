import { getDb } from "@/lib/db";

/** Words are lowercased alphanumerics, min length 2 (simple MVP tokenizer). */
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [];
}

function countMatches(terms: string[], wordCounts: Map<string, number>): number {
  let n = 0;
  for (const t of terms) {
    n += wordCounts.get(t) ?? 0;
  }
  return n;
}

function buildWordCounts(text: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const w of tokenize(text)) {
    m.set(w, (m.get(w) ?? 0) + 1);
  }
  return m;
}

/** Title hits weighted higher than body hits (same term can contribute in both). */
const TITLE_WEIGHT = 3;
const CONTENT_WEIGHT = 1;

function lexicalScore(query: string, title: string, content: string): number {
  const qTerms = tokenize(query);
  if (qTerms.length === 0) return 0;

  const uniqueQuery = [...new Set(qTerms)];
  const titleCounts = buildWordCounts(title);
  const contentCounts = buildWordCounts(content);

  const titlePart = TITLE_WEIGHT * countMatches(uniqueQuery, titleCounts);
  const contentPart = CONTENT_WEIGHT * countMatches(uniqueQuery, contentCounts);
  return titlePart + contentPart;
}

export type RankedKnowledgeChunk = {
  id: string;
  title: string;
  sourceUrl: string;
  content: string;
  score: number;
};

/**
 * Load chunks for a bot, rank by simple lexical overlap with the query, return top K.
 * No vectors — good enough for small KBs and smoke tests.
 */
export async function retrieveRelevantChunks(
  botConfigId: string,
  query: string,
  topK = 5
): Promise<RankedKnowledgeChunk[]> {
  const rows = await getDb().knowledgeChunk.findMany({
    where: { botConfigId },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      content: true,
    },
  });

  const scored = rows.map((row) => ({
    id: row.id,
    title: row.title,
    sourceUrl: row.sourceUrl,
    content: row.content,
    score: lexicalScore(query, row.title, row.content),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });

  return scored.slice(0, topK);
}

/** Turn ranked chunks into a single block for the system prompt. */
export function formatChunksForPrompt(chunks: RankedKnowledgeChunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] ${c.title}\nSource: ${c.sourceUrl}\n${c.content}`
    )
    .join("\n\n---\n\n");
}
