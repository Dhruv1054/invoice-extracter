"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "80vh",
      color: "var(--text)",
      gap: "1rem",
    }}>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--danger)" }}>Something went wrong</div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: 500, textAlign: "center" }}>
        {error.message}
      </div>
      <button
        onClick={reset}
        style={{
          padding: "0.5rem 1.25rem",
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Try again
      </button>
    </div>
  );
}
