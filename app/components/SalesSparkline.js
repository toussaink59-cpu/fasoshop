// Petit graphique en aire des ventes des 30 derniers jours, utilisé sur la
// page Revenus du dashboard vendeur.
export default function SalesSparkline({ data }) {
  const width = 600;
  const height = 90;
  const max = Math.max(...data.map((d) => d.gross), 1);
  const stepX = width / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - (d.gross / max) * (height - 10) - 5;
    return `${x},${y}`;
  });

  const areaPoints = `0,${height} ${points.join(" ")} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 90, display: "block" }}>
      <polygon points={areaPoints} fill="var(--orange-100)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--orange-500)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
