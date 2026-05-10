"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Upload" },
  { href: "/chat", label: "Chat" },
  { href: "/masterdata", label: "Master Data" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 2rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        height: "60px",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--accent)", marginRight: "1.5rem" }}>
        InvoiceAI
      </span>
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "6px",
              fontSize: "0.9rem",
              fontWeight: active ? 600 : 400,
              color: active ? "#fff" : "var(--text-muted)",
              background: active ? "var(--accent)" : "transparent",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
