import { ImageResponse } from "next/og";

export const alt = "Proto-Semitic reconstructed root";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const display = decodeURIComponent(slug).replace(/-/g, "-");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #1a0c2e 0%, #2d1b4e 50%, #0f172a 100%)",
          color: "#f8fafc", fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#f59e0b" }} />
          <div style={{ fontSize: 28, color: "#cbd5e1" }}>Semitic Search · Proto-Semitic</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 28, color: "#cbd5e1", letterSpacing: 2 }}>RECONSTRUCTED ROOT</div>
          <div
            style={{
              fontSize: 180, fontFamily: "monospace", fontWeight: 700,
              letterSpacing: -4, lineHeight: 1, color: "#f8fafc",
              display: "flex", alignItems: "baseline", gap: 16,
            }}
          >
            <span style={{ color: "#f59e0b" }}>*</span>
            <span>{display}</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 32, color: "#f1f5f9" }}>
            Predicted surface reflexes across 17 Semitic languages
          </div>
          <div style={{ fontSize: 20, color: "#64748b" }}>
            semitic-search.andy-barr.com
          </div>
        </div>
      </div>
    ),
    size,
  );
}
