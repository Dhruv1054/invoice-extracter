"use client";
import { useState, useCallback, useEffect } from "react";
import { uploadInvoice, listInvoices, deleteInvoice, downloadUrl } from "@/lib/api";

interface Invoice {
  filename: string;
  stem: string;
  size_kb: number;
  created_at: string;
}

const S = {
  page: { maxWidth: 960, margin: "0 auto", padding: "2rem 1.5rem" } as React.CSSProperties,
  h1: { fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem" } as React.CSSProperties,
  sub: { color: "var(--text-muted)", marginBottom: "2rem", fontSize: "0.95rem" } as React.CSSProperties,
  dropzone: (active: boolean): React.CSSProperties => ({
    border: `2px dashed ${active ? "var(--accent)" : "var(--border)"}`,
    borderRadius: 12,
    padding: "3rem 2rem",
    textAlign: "center",
    cursor: "pointer",
    background: active ? "rgba(99,102,241,0.06)" : "var(--surface)",
    transition: "all 0.2s",
    marginBottom: "2rem",
  }),
  uploadIcon: { fontSize: "2.5rem", marginBottom: "0.75rem" } as React.CSSProperties,
  uploadText: { color: "var(--text-muted)", fontSize: "0.9rem" } as React.CSSProperties,
  btn: (variant: "primary" | "danger" | "ghost"): React.CSSProperties => ({
    padding: "0.4rem 0.9rem",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 500,
    background:
      variant === "primary" ? "var(--accent)"
      : variant === "danger" ? "rgba(239,68,68,0.15)"
      : "transparent",
    color:
      variant === "primary" ? "#fff"
      : variant === "danger" ? "var(--danger)"
      : "var(--text-muted)",
    transition: "opacity 0.15s",
  }),
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "1rem 1.25rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "0.75rem",
  } as React.CSSProperties,
  pill: (ok: boolean): React.CSSProperties => ({
    padding: "2px 8px",
    borderRadius: 20,
    fontSize: "0.75rem",
    background: ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
    color: ok ? "var(--success)" : "var(--danger)",
  }),
  progress: {
    width: "100%",
    height: 4,
    background: "var(--border)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: "1rem",
  } as React.CSSProperties,
  progressBar: {
    height: "100%",
    background: "var(--accent)",
    borderRadius: 2,
    transition: "width 0.3s",
  } as React.CSSProperties,
};

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const loadInvoices = useCallback(async () => {
    try {
      const data = await listInvoices();
      setInvoices(data.invoices.filter((i: Invoice) => !i.filename.startsWith("masterdata_")));
    } catch {}
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setProgress(10);
    setMessage(null);

    const results: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const res = await uploadInvoice(file);
        results.push(`${file.name} → ${res.tables_extracted} table(s) extracted`);
      } catch (e: any) {
        errors.push(`${file.name}: ${e.message}`);
      }
      setProgress(Math.round(((i + 1) / files.length) * 90) + 10);
    }

    setProgress(100);
    setUploading(false);
    await loadInvoices();

    if (errors.length > 0) {
      setMessage({ text: errors.join(" | "), ok: false });
    } else {
      setMessage({ text: results.join(" | "), ok: true });
    }
    setTimeout(() => setProgress(0), 800);
  }, [loadInvoices]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDelete = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;
    await deleteInvoice(filename);
    await loadInvoices();
  };

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Invoice Extractor</h1>
      <p style={S.sub}>Upload invoices (PDF, JPG, PNG) — tables are extracted and saved as Excel files.</p>

      <div
        style={S.dropzone(dragging)}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <div style={S.uploadIcon}>📤</div>
        <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>
          {dragging ? "Drop files here" : "Drag & drop invoices here"}
        </div>
        <div style={S.uploadText}>or click to browse · PDF, JPG, PNG supported · multiple files OK</div>
        <input
          id="file-input"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {uploading && (
        <div style={S.progress}>
          <div style={{ ...S.progressBar, width: `${progress}%` }} />
        </div>
      )}
      {uploading && (
        <p style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "0.5rem", fontSize: "0.9rem" }}>
          Processing with AI — extracting tables...
        </p>
      )}

      {message && (
        <div style={{
          marginTop: "1rem",
          padding: "0.75rem 1rem",
          borderRadius: 8,
          background: message.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${message.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: message.ok ? "var(--success)" : "var(--danger)",
          fontSize: "0.88rem",
        }}>
          {message.ok ? "✓ " : "✗ "}{message.text}
        </div>
      )}

      {invoices.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
            Processed Invoices ({invoices.length})
          </h2>
          {invoices.map((inv) => (
            <div key={inv.filename} style={S.card}>
              <span style={{ fontSize: "1.4rem" }}>📊</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{inv.stem}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {inv.size_kb} KB · {new Date(inv.created_at).toLocaleString()}
                </div>
              </div>
              <span style={S.pill(true)}>Excel ready</span>
              <a href={downloadUrl(inv.filename)} download style={S.btn("primary")}>
                Download
              </a>
              <button style={S.btn("danger")} onClick={() => onDelete(inv.filename)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {invoices.length === 0 && !uploading && (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem 0", fontSize: "0.9rem" }}>
          No invoices processed yet. Upload one above to get started.
        </div>
      )}
    </div>
  );
}
