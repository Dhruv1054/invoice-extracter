"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { sendChat, listInvoices, downloadUrl } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Invoice {
  filename: string;
  stem: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listInvoices().then((d) => {
      const inv = (d.invoices as Invoice[]).filter((i) => !i.filename.startsWith("masterdata_"));
      setInvoices(inv);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const toggleFile = (filename: string) => {
    setSelected((prev) =>
      prev.includes(filename) ? prev.filter((f) => f !== filename) : [...prev, filename]
    );
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);

    try {
      const res = await sendChat(
        text,
        messages,
        selected.length > 0 ? selected : undefined
      );
      setMessages([...nextHistory, { role: "assistant", content: res.reply }]);
    } catch (e: any) {
      setMessages([
        ...nextHistory,
        { role: "assistant", content: `Error: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, selected]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)" }}>
      {/* Sidebar */}
      <aside style={{
        width: 260,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        overflowY: "auto",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
          Filter Invoices
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          Select invoices to query (none = all)
        </p>
        {invoices.length === 0 && (
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No invoices yet.</p>
        )}
        {invoices.map((inv) => {
          const active = selected.includes(inv.filename);
          return (
            <label key={inv.filename} style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              cursor: "pointer",
              background: active ? "rgba(99,102,241,0.12)" : "transparent",
              border: `1px solid ${active ? "var(--accent)" : "transparent"}`,
              fontSize: "0.85rem",
            }}>
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggleFile(inv.filename)}
                style={{ accentColor: "var(--accent)" }}
              />
              {inv.stem}
            </label>
          );
        })}
        {selected.length > 0 && (
          <button
            onClick={() => setSelected([])}
            style={{
              marginTop: "auto",
              padding: "0.4rem",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Clear selection
          </button>
        )}
      </aside>

      {/* Chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", paddingTop: "4rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>💬</div>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Ask anything about your invoices</div>
              <div style={{ fontSize: "0.88rem" }}>
                Examples: "What is the total amount in invoice X?" · "List all line items" · "Which invoice has the highest tax?"
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "1rem",
            }}>
              <div style={{
                maxWidth: "72%",
                padding: "0.75rem 1rem",
                borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                background: msg.role === "user" ? "var(--accent)" : "var(--surface)",
                border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                fontSize: "0.9rem",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", marginBottom: "1rem" }}>
              <div style={{
                padding: "0.75rem 1rem",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px 12px 12px 2px",
                fontSize: "0.9rem",
                color: "var(--text-muted)",
              }}>
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "1rem 2rem",
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-end",
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask a question about your invoices... (Enter to send, Shift+Enter for newline)"
            rows={1}
            style={{
              flex: 1,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0.65rem 0.9rem",
              color: "var(--text)",
              fontSize: "0.9rem",
              resize: "none",
              outline: "none",
              lineHeight: 1.5,
              maxHeight: 120,
              overflowY: "auto",
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              padding: "0.65rem 1.2rem",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              opacity: loading || !input.trim() ? 0.5 : 1,
              fontWeight: 600,
              fontSize: "0.9rem",
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
