"use client";

import { useState } from "react";

export default function ManagerPage() {
  // const [instruction, setInstruction] = useState(
  //   "Create a support agent that prioritizes empathy and short answers."
  // );
  const [instruction, setInstruction] = useState("");
  const [fileName, setFileName] = useState("uploaded-doc.txt");
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/manager/generate-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, fileName, rawText }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.25rem", marginTop: 0 }}>Manager</h1>
      <p style={{ color: "#444", fontSize: "0.9rem" }}>
        Paste document text and instructions to generate an agent profile.
      </p>

      <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
        Manager instructions
      </label>
      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={6}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "0.5rem",
          fontFamily: "inherit",
          marginBottom: "0.75rem",
        }}
      />

      <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
        File name
      </label>
      <input
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "0.5rem",
          fontFamily: "inherit",
          marginBottom: "0.75rem",
        }}
      />

      <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
        Uploaded document text
      </label>
      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={10}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "0.5rem",
          fontFamily: "inherit",
          marginBottom: "0.75rem",
        }}
        placeholder="Paste support doc or policy text here"
      />

      <button type="button" onClick={() => void run()} disabled={loading}>
        {loading ? "Generating…" : "Generate agent"}
      </button>

      {result ? (
        <pre
          style={{
            marginTop: "1rem",
            background: "#fff",
            border: "1px solid #ccc",
            padding: "0.5rem",
            fontSize: "0.85rem",
            overflow: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {result}
        </pre>
      ) : null}
    </div>
  );
}