/**
 * Collapse runs of whitespace and trim. Keeps a single space between words.
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Split text into overlapping windows for embedding. Empty input yields [].
 */
export function chunkText(
  text: string,
  size = 900,
  overlap = 120
): string[] {
  const t = normalizeWhitespace(text);
  if (!t) return [];

  const chunks: string[] = [];
  let i = 0;
  while (i < t.length) {
    const end = Math.min(i + size, t.length);
    chunks.push(t.slice(i, end));
    if (end >= t.length) break;
    i = Math.max(end - overlap, i + 1);
  }
  return chunks;
}
