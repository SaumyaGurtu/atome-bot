"use client";

import { useCallback, useState } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; url: string }>;
  usedTool?: string;
  trace?: { intent: string };
};

export default function CustomerBotPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reportIndex, setReportIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [correctedAnswer, setCorrectedAnswer] = useState("");
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setReportStatus(null);

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = (await res.json()) as {
        message?: string;
        error?: string;
        sources?: Array<{ title: string; url: string }>;
        usedTool?: string;
        trace?: { intent: string };
      };

      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }

      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.message ?? "",
          sources: data.sources ?? [],
          usedTool: data.usedTool,
          trace: data.trace,
        },
      ]);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const submitMistakeReport = useCallback(async () => {
    if (reportIndex === null) return;

    const assistantMsg = messages[reportIndex];
    const userMsg = messages[reportIndex - 1];

    if (!assistantMsg || !userMsg || assistantMsg.role !== "assistant" || userMsg.role !== "user") {
      setReportStatus("Could not identify the related user/bot messages.");
      return;
    }

    try {
      setReportStatus("Submitting...");
      const res = await fetch("/api/mistakes/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuestion: userMsg.content,
          botAnswer: assistantMsg.content,
          userFeedback: feedback,
          correctedAnswer: correctedAnswer || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReportStatus(data.error ?? "Failed to submit report");
        return;
      }

      setReportStatus("Mistake reported successfully.");
      setFeedback("");
      setCorrectedAnswer("");
      setReportIndex(null);
    } catch {
      setReportStatus("Network error while reporting.");
    }
  }, [reportIndex, messages, feedback, correctedAnswer]);

  return (
    <div>
      <h1 style={{ fontSize: "1.25rem", marginTop: 0 }}>Customer Bot</h1>
      <p style={{ color: "#444", fontSize: "0.9rem" }}>
        Chat uses OpenAI and your indexed knowledge base. You can also report mistakes.
      </p>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 6,
          padding: "0.75rem",
          minHeight: 240,
          background: "#fff",
          marginBottom: "0.75rem",
          whiteSpace: "pre-wrap",
        }}
      >
        {messages.length === 0 ? (
          <span style={{ color: "#888" }}>Messages appear here.</span>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              style={{
                marginBottom: "1rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid #eee",
              }}
            >
              <div>
                <strong>{m.role === "user" ? "You" : "Bot"}:</strong> {m.content}
              </div>

              {m.role === "assistant" && (
                <div style={{ marginTop: 8, fontSize: "0.9rem" }}>
                  {m.trace?.intent ? (
                    <div>
                      <strong>Intent:</strong> {m.trace.intent}
                    </div>
                  ) : null}

                  {m.usedTool ? (
                    <div>
                      <strong>Tool:</strong> {m.usedTool}
                    </div>
                  ) : null}

                  {m.sources && m.sources.length > 0 ? (
                    <div style={{ marginTop: 6 }}>
                      <strong>Sources:</strong>
                      <ul style={{ marginTop: 6 }}>
                        {m.sources.map((s, idx) => (
                          <li key={idx}>
                            <a href={s.url} target="_blank" rel="noreferrer">
                              {s.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setReportIndex(i);
                      setReportStatus(null);
                    }}
                    style={{ marginTop: 8 }}
                  >
                    Report mistake
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {error ? (
        <p style={{ color: "#b00020", fontSize: "0.9rem" }}>{error}</p>
      ) : null}

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          style={{
            flex: 1,
            padding: "0.5rem",
            fontFamily: "inherit",
            fontSize: "0.95rem",
          }}
          placeholder="Type a message…"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "…" : "Send"}
        </button>
      </div>

      {reportIndex !== null ? (
        <div
          style={{
            marginTop: "1rem",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: "0.75rem",
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Report mistake</h2>

          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            What was wrong?
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "0.5rem",
              fontFamily: "inherit",
              marginBottom: "0.75rem",
            }}
          />

          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Corrected answer (optional)
          </label>
          <textarea
            value={correctedAnswer}
            onChange={(e) => setCorrectedAnswer(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "0.5rem",
              fontFamily: "inherit",
              marginBottom: "0.75rem",
            }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => void submitMistakeReport()}>
              Submit report
            </button>
            <button
              type="button"
              onClick={() => {
                setReportIndex(null);
                setFeedback("");
                setCorrectedAnswer("");
                setReportStatus(null);
              }}
            >
              Cancel
            </button>
          </div>

          {reportStatus ? (
            <p style={{ marginTop: 10, fontSize: "0.9rem" }}>{reportStatus}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}