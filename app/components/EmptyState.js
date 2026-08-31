"use client";

import Link from "next/link";
import { PackageIcon } from "@/app/components/Icons";

export default function EmptyState({ Icon, title, hint, ctaHref, ctaLabel }) {
  const Ico = Icon || PackageIcon;
  return (
    <div style={{
      textAlign: "center", padding: "48px 20px", background: "#fff",
      border: "1px dashed var(--border, #e5e2d9)", borderRadius: 16,
    }}>
      <div style={{
        width: 64, height: 64, margin: "0 auto 14px", borderRadius: "50%",
        background: "var(--sand-100, #f3efe7)", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <Ico size={28} style={{ color: "var(--gold-600, #d4af37)" }} />
      </div>
      <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem", color: "var(--ink-900, #241712)" }}>{title}</h3>
      {hint && (
        <p style={{
          margin: "0 auto 18px", fontSize: "0.88rem", color: "var(--ink-400, #8a7f75)",
          maxWidth: 380, lineHeight: 1.5,
        }}>{hint}</p>
      )}
      {ctaHref && ctaLabel && (
        <Link href={ctaHref} className="btn btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
