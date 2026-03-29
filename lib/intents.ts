export type CustomerIntent = "faq" | "support" | "general";

/** Lightweight keyword routing for future tool selection. */
export function detectIntent(text: string): CustomerIntent {
  const t = text.toLowerCase();
  if (/\b(how|what|why|when|where)\b/.test(t)) return "faq";
  if (/\b(bug|error|broken|help|issue)\b/.test(t)) return "support";
  return "general";
}

/** User is asking about an application / card application status. */
export function detectApplicationStatusIntent(message: string): boolean {
  const t = message.toLowerCase();
  return (
    /\b(application|apply|applying|applied)\b/.test(t) &&
    /\b(status|approved|declined|pending|review|update|check|where|how)\b/.test(t)
  ) || /\bapplication\s+status\b/.test(t) || /\bstatus\s+of\s+(my\s+)?application\b/.test(t);
}

/** User is describing a failed or declined payment / transaction. */
export function detectFailedTransactionIntent(message: string): boolean {
  const t = message.toLowerCase();
  return (
    /\b(failed|declined|rejected|unsuccessful|could\s+not|couldn't|didn't\s+go\s+through)\b/.test(
      t
    ) && /\b(payment|pay|charge|transaction|purchase|order|checkout)\b/.test(t)
  ) || /\btransaction\s+failed\b/.test(t) || /\bpayment\s+failed\b/.test(t);
}

/**
 * First contiguous alphanumeric run of length ≥ 6 (typical reference / txn id shape).
 */
export function extractTransactionId(message: string): string | null {
  const m = message.match(/[A-Za-z0-9]{6,}/);
  return m ? m[0]! : null;
}
