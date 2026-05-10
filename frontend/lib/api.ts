const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function uploadInvoice(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/upload-invoice`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function listInvoices() {
  const res = await fetch(`${BASE}/invoices`);
  if (!res.ok) throw new Error("Failed to load invoices");
  return res.json();
}

export async function deleteInvoice(filename: string) {
  const res = await fetch(`${BASE}/invoices/${encodeURIComponent(filename)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}

export function downloadUrl(filename: string) {
  return `${BASE}/invoices/${encodeURIComponent(filename)}/download`;
}

export async function sendChat(message: string, history: { role: string; content: string }[], targetFiles?: string[]) {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, target_files: targetFiles }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Chat failed");
  }
  return res.json();
}

export async function generateMasterdata(columns: string[]) {
  const res = await fetch(`${BASE}/generate-masterdata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ columns }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Generation failed");
  }
  return res.json();
}

export async function listMasterdataFiles() {
  const res = await fetch(`${BASE}/masterdata/files`);
  if (!res.ok) throw new Error("Failed to load master data files");
  return res.json();
}

export function masterdataDownloadUrl(filename: string) {
  return `${BASE}/masterdata/${encodeURIComponent(filename)}/download`;
}
