import { getOpenAI } from "@/lib/openai";

export type GeneratedAgentPayload = {
  name: string;
  systemPrompt: string;
  additionalGuidelines: string;
  tools: string[];
  assumptions: string[];
};

/** Uses an LLM to draft a JSON agent profile for the manager UI. */
export async function generateAgentProfile(
  instruction: string,
  uploadedDocText?: string
): Promise<GeneratedAgentPayload> {
  const openai = getOpenAI();

  const userContent = `
Manager instruction:
${instruction}

Uploaded document text:
${uploadedDocText?.trim() ? uploadedDocText : "No uploaded document text provided."}

Return a single JSON object only with keys:
- name (string)
- systemPrompt (string)
- additionalGuidelines (string)
- tools (array of strings)
- assumptions (array of strings)

Make the result practical for a customer support AI bot.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a meta-agent that helps create customer support AI agents. Respond with one valid JSON object only.",
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(text) as Partial<GeneratedAgentPayload>;

    return {
      name: typeof parsed.name === "string" ? parsed.name : "agent",
      systemPrompt:
        typeof parsed.systemPrompt === "string"
          ? parsed.systemPrompt
          : "You are a helpful customer support agent.",
      additionalGuidelines:
        typeof parsed.additionalGuidelines === "string"
          ? parsed.additionalGuidelines
          : "Be concise, polite, and grounded in the provided documents.",
      tools: Array.isArray(parsed.tools)
        ? parsed.tools.filter((t): t is string => typeof t === "string")
        : [],
      assumptions: Array.isArray(parsed.assumptions)
        ? parsed.assumptions.filter((a): a is string => typeof a === "string")
        : [],
    };
  } catch {
    return {
      name: "agent",
      systemPrompt: "You are a helpful customer support agent.",
      additionalGuidelines:
        "Be concise, polite, and grounded in the provided documents.",
      tools: [],
      assumptions: ["Fallback response used because model output was not valid JSON."],
    };
  }
}
