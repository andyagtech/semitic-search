import { ImageResponse } from "next/og";

export const alt = "Semitic root attestation timeline";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #065f46 100%)",
          color: "#f8fafc", fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#10b981" }} />
          <div style={{ fontSize: 28, color: "#cbd5e1" }}>Semitic Search · Attestation Timeline</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: "#f8fafc", letterSpacing: -1, lineHeight: 1 }}>
            When did each Semitic root first appear in writing?
          </div>
          <div style={{ fontSize: 28, color: "#a7f3d0" }}>
            Tanakh · Qur&apos;an · cross-indexed to 17 Semitic varieties
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 32, fontSize: 22, color: "#94a3b8" }}>
            <span>📜 Tanakh (c. 1200–400 BCE)</span>
            <span>☪︎ Qur&apos;an (c. 610–632 CE)</span>
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
