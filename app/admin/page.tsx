"use client";

import { useCallback, useEffect, useState } from "react";

type BotConfig = {
  id: string;
  name: string;
  knowledgeBaseUrl: string;
  additionalGuidelines: string;
  systemPrompt: string;
};

type MistakeReport = {
  id: string;
  userQuestion: string;
  botAnswer: string;
  userFeedback: string;
  correctedAnswer: string | null;
  problemType: string | null;
  fixSummary: string | null;
  status: string;
  createdAt: string;
};

export default function AdminPage() {
  const [bot, setBot] = useState<BotConfig | null>(null);
  const [mistakes, setMistakes] = useState<MistakeReport[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const [configRes, mistakeRes] = await Promise.all([
        fetch("/api/admin/config"),
        fetch("/api/mistakes/list"),
      ]);

      const configData = await configRes.json();
      const mistakeData = await mistakeRes.json();

      if (!configRes.ok) {
        setStatus(configData.error ?? "Failed to load config");
        return;
      }

      setBot(configData.bots?.[0] ?? null);
      setMistakes(mistakeData.items ?? []);
    } catch {
      setStatus("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!bot) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bot.id,
          name: bot.name,
          knowledgeBaseUrl: bot.knowledgeBaseUrl,
          additionalGuidelines: bot.additionalGuidelines,
          systemPrompt: bot.systemPrompt,
        }),
      });
      const data = await res.json();
      setStatus(res.ok ? "Saved." : (data.error ?? "Save failed"));
      if (res.ok && data.bot) setBot(data.bot);
    } catch {
      setStatus("Network error");
    } finally {
      setLoading(false);
    }
  };

  const reindex = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/reindex", { method: "POST" });
      const data = await res.json();
      setStatus(
        res.ok
          ? `Reindexed: ${data.chunkCount} chunks.`
          : (data.error ?? "Reindex failed")
      );
    } catch {
      setStatus("Network error");
    } finally {
      setLoading(false);
    }
  };

  const archiveReport = async (id: string) => {
    try {
      const res = await fetch("/api/mistakes/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Archive failed");
        return;
      }
      await load();
    } catch {
      setStatus("Network error");
    }
  };

  const field = (label: string, key: keyof BotConfig, rows: number) =>
    bot ? (
      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
          {label}
        </label>
        <textarea
          value={bot[key]}
          onChange={(e) => setBot({ ...bot, [key]: e.target.value })}
          rows={rows}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "0.5rem",
            fontFamily: "inherit",
          }}
        />
      </div>
    ) : null;

  return (
    <div>
      <h1 style={{ fontSize: "1.25rem", marginTop: 0 }}>Admin</h1>
      <p style={{ color: "#444", fontSize: "0.9rem" }}>
        Edit the bot, reindex the KB, and review reported mistakes.
      </p>

      {!bot && !loading ? (
        <p>No BotConfig found. Run <code>npm run seed</code>.</p>
      ) : null}

      {field("Name", "name", 1)}
      {field("Knowledge base URL", "knowledgeBaseUrl", 2)}
      {field("Additional guidelines", "additionalGuidelines", 6)}
      {field("System prompt", "systemPrompt", 8)}

      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => void save()}
          disabled={loading || !bot}
          style={{ marginRight: 8 }}
        >
          Save
        </button>
        <button type="button" onClick={() => void reindex()} disabled={loading}>
          Reindex embeddings
        </button>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          style={{ marginLeft: 8 }}
        >
          Refresh
        </button>
      </div>

      {status ? (
        <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>{status}</p>
      ) : null}

      <hr style={{ margin: "1.5rem 0" }} />

      <h2 style={{ fontSize: "1.1rem" }}>Mistake reports</h2>

      {mistakes.length === 0 ? (
        <p style={{ color: "#666" }}>No mistake reports yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {mistakes.map((m) => (
            <div
              key={m.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: "0.75rem",
                background: "#fff",
              }}
            >
              <div><strong>Status:</strong> {m.status}</div>
              <div><strong>Problem type:</strong> {m.problemType ?? "-"}</div>
              <div style={{ marginTop: 8 }}><strong>User question:</strong> {m.userQuestion}</div>
              <div style={{ marginTop: 8 }}><strong>Bot answer:</strong> {m.botAnswer}</div>
              <div style={{ marginTop: 8 }}><strong>User feedback:</strong> {m.userFeedback}</div>
              {m.correctedAnswer ? (
                <div style={{ marginTop: 8 }}><strong>Corrected answer:</strong> {m.correctedAnswer}</div>
              ) : null}
              {m.fixSummary ? (
                <div style={{ marginTop: 8 }}><strong>Fix summary:</strong> {m.fixSummary}</div>
              ) : null}

              {m.status !== "archived" ? (
                <button
                  type="button"
                  onClick={() => void archiveReport(m.id)}
                  style={{ marginTop: 12 }}
                >
                  Archive
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}