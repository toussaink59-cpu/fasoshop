import { TruckIcon } from "@/app/components/Icons";

const card = {
  display: "inline-flex", alignItems: "center", gap: 8,
  background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8,
  padding: "6px 12px", boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
};
const mark = (bg) => ({
  width: 18, height: 18, borderRadius: 4, background: bg, color: "#fff",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontWeight: 800, fontSize: 11, lineHeight: 1, flexShrink: 0,
});
const label = { fontSize: "0.8rem", color: "#3d3d3d", whiteSpace: "nowrap" };

export default function PaymentMethods() {
  return (
    <div className="temu-footer-payment-badges" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      <span style={card}>
        <span style={mark("#FF7900")}>O</span>
        <span style={label}><b style={{ color: "#FF7900" }}>orange</b> money</span>
      </span>
      <span style={card}>
        <span style={mark("#0066B3")}>M</span>
        <span style={label}><b style={{ color: "#0066B3" }}>moov</b> money</span>
      </span>
      <span style={card}>
        <span style={mark("#1DC8FF")}>W</span>
        <span style={{ ...label, fontWeight: 800, color: "#0AA6C9" }}>wave</span>
      </span>
      <span style={card}>
        <span style={{ color: "#2f7d3b", display: "inline-flex" }}><TruckIcon size={18} /></span>
        <span style={label}>À la livraison</span>
      </span>
    </div>
  );
}
