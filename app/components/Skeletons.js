"use client";

export function Skeleton({ style }) {
  return <div className="skeleton" style={style} />;
}

export function ProductCardSkeleton() {
  return (
    <div style={{ padding: 10, border: "1px solid var(--border, #e5e2d9)", borderRadius: 12, background: "#fff" }}>
      <Skeleton style={{ width: "100%", height: 140, borderRadius: 8, marginBottom: 10 }} />
      <Skeleton style={{ width: "80%", height: 14, marginBottom: 8 }} />
      <Skeleton style={{ width: "50%", height: 12, marginBottom: 10 }} />
      <Skeleton style={{ width: "60%", height: 16, marginBottom: 12 }} />
      <Skeleton style={{ width: "100%", height: 36, borderRadius: 8 }} />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div style={{ padding: 14, border: "1px solid var(--border, #e5e2d9)", borderRadius: 12, background: "#fff" }}>
      <Skeleton style={{ width: 24, height: 24, borderRadius: 6, marginBottom: 10 }} />
      <Skeleton style={{ width: "70%", height: 20, marginBottom: 6 }} />
      <Skeleton style={{ width: "50%", height: 12 }} />
    </div>
  );
}

export function KpiGridSkeleton({ count = 4 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => <KpiSkeleton key={i} />)}
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 14px", borderBottom: "1px solid var(--border, #e5e2d9)", alignItems: "center" }}>
      <Skeleton style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <Skeleton style={{ width: "60%", height: 14, marginBottom: 6 }} />
        <Skeleton style={{ width: "40%", height: 12 }} />
      </div>
      <Skeleton style={{ width: 70, height: 14 }} />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div style={{ border: "1px solid var(--border, #e5e2d9)", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
      {Array.from({ length: rows }).map((_, i) => <ListRowSkeleton key={i} />)}
    </div>
  );
}
