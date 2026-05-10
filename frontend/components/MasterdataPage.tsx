"use client";
import { useState, useEffect } from "react";
import { generateMasterdata, listMasterdataFiles, masterdataDownloadUrl } from "@/lib/api";

interface MdFile {
  filename: string;
  size_kb: number;
  created_at: string;
}

const S = {
  page: { maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" } as React.CSSProperties,
  h1: { fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem" } as React.CSSProperties,
  sub: { color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "2rem" } as React.CSSProperties,
  section: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "1.5rem",
    marginBottom: "2rem",
  } as React.CSSProperties,
  label: { display: "block", fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.95rem" } as React.CSSProperties,
  input: {
    width: "100%",
    background: "var(--surface-2, #22263a)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "0.6rem 0.9rem",
    color: "var(--text)",
    fontSize: "0.9rem",
    outline: "none",
  } as React.CSSProperties,
  tagList: { display: "flex", flexWrap: "wrap" as const, gap: "0.5rem", marginTop: "0.75rem" },
  tag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.3rem 0.7rem",
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: 20,
    fontSize: "0.83rem",
    color: "var(--text)",
  } as React.CSSProperties,
  tagX: { cursor: "pointer", color: "var(--text-muted)", fontWeight: 700, lineHeight: 1 } as React.CSSProperties,
  btn: {
    marginTop: "1.25rem",
    padding: "0.65rem 1.5rem",
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
  } as React.CSSProperties,
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "0.9rem 1.1rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "0.6rem",
  } as React.CSSProperties,
};

export default function MasterdataPage() {
  const [colInput, setColInput] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<MdFile[]>([]);

  const loadFiles = () =>
    listMasterdataFiles().then((d) => setFiles(d.files)).catch(() => {});

  useEffect(() => { loadFiles(); }, []);

  const addColumn = () => {
    const val = colInput.trim();
    if (!val) return;
    const parts = val.split(",").map((s) => s.trim()).filter(Boolean);
    setColumns((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (!next.includes(p)) next.push(p);
      }
      return next;
    });
    setColInput("");
  };

  const removeCol = (c: string) => setColumns((prev) => prev.filter((x) => x !== c));

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addColumn();
    }
  };

  const generate = async () => {
    if (columns.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateMasterdata(columns);
      setResult(res);
      await loadFiles();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Master Data Generator</h1>
      <p style={S.sub}>
        Specify the column names you want. The system will scan all processed invoices and compile matching columns into a single Excel file.
      </p>

      <div style={S.section}>
        <label style={S.label}>Column Names</label>
        <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
          Type a column name and press Enter or comma to add. Column matching is case-insensitive.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            style={{ ...S.input, flex: 1 }}
            placeholder='e.g. "Description" or "Unit Price, Total, Tax"'
            value={colInput}
            onChange={(e) => setColInput(e.target.value)}
            onKeyDown={onKey}
          />
          <button
            onClick={addColumn}
            style={{
              padding: "0.6rem 1rem",
              background: "var(--surface-2, #22263a)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Add
          </button>
        </div>

        {columns.length > 0 && (
          <div style={S.tagList}>
            {columns.map((c) => (
              <span key={c} style={S.tag}>
                {c}
                <span style={S.tagX} onClick={() => removeCol(c)}>×</span>
              </span>
            ))}
          </div>
        )}

        <button
          style={{ ...S.btn, opacity: columns.length === 0 || loading ? 0.5 : 1, cursor: columns.length === 0 || loading ? "not-allowed" : "pointer" }}
          disabled={columns.length === 0 || loading}
          onClick={generate}
        >
          {loading ? "Generating..." : "Generate Master Data"}
        </button>

        {error && (
          <div style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "var(--danger)",
            fontSize: "0.88rem",
          }}>
            ✗ {error}
          </div>
        )}

        {result && (
          <div style={{
            marginTop: "1rem",
            padding: "1rem",
            borderRadius: 8,
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.3)",
            fontSize: "0.88rem",
          }}>
            <div style={{ fontWeight: 600, color: "var(--success)", marginBottom: "0.5rem" }}>
              ✓ Master data generated — {result.total_rows} row(s)
            </div>
            <div style={{ color: "var(--text-muted)" }}>
              Sources matched: {result.invoices_matched?.join(", ")}
            </div>
            <a
              href={masterdataDownloadUrl(result.output_filename)}
              download
              style={{
                display: "inline-block",
                marginTop: "0.75rem",
                padding: "0.45rem 1rem",
                background: "var(--accent)",
                color: "#fff",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              Download {result.output_filename}
            </a>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
            Previously Generated ({files.length})
          </h2>
          {files.map((f) => (
            <div key={f.filename} style={S.card}>
              <span style={{ fontSize: "1.3rem" }}>📋</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{f.filename}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {f.size_kb} KB · {new Date(f.created_at).toLocaleString()}
                </div>
              </div>
              <a
                href={masterdataDownloadUrl(f.filename)}
                download
                style={{
                  padding: "0.35rem 0.8rem",
                  background: "var(--accent)",
                  color: "#fff",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                }}
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
