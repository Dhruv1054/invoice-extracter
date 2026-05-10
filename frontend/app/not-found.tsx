export default function NotFound() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "80vh",
      color: "var(--text-muted)",
    }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>404</div>
      <div style={{ fontSize: "1.1rem" }}>Page not found</div>
    </div>
  );
}
