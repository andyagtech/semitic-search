import { ImageResponse } from "next/og";
import { familyBySlug } from "@/lib/root_families";

export const alt = "Semitic root family";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dynamic OG image for each /roots/[slug] page. Shows the canonical root
// (e.g. "k-t-b") in large monospace plus metadata. Kept text-only because
// embedding cuneiform / Ugaritic / Phoenician fonts would balloon the
// image payload and many still wouldn't render cleanly on Vercel's
// rasterizer. Canonical transliteration is script-agnostic anyway.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fam = familyBySlug(decodeURIComponent(slug));
  const rootDisplay = (fam?.canonical ?? slug).replace(/ /g, "-");
  const lemmaCount = fam?.lemma_count ?? 0;
  const langCount = fam?.lang_count ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)",
          color: "#f8fafc",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 14, height: 14, borderRadius: 7,
              background: "linear-gradient(135deg, #10b981, #8b5cf6)",
            }}
          />
          <div style={{ fontSize: 28, color: "#94a3b8" }}>Semitic Search</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 28, color: "#cbd5e1", letterSpacing: 2 }}>
            ROOT FAMILY
          </div>
          <div
            style={{
              fontSize: 180,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: -4,
              lineHeight: 1,
              color: "#f8fafc",
            }}
          >
            {rootDisplay}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 36, color: "#f1f5f9" }}>
            {lemmaCount > 0 ? `${lemmaCount} lemmas · ${langCount} Semitic languages` : "Cross-script cognate family"}
          </div>
          <div style={{ fontSize: 22, color: "#64748b" }}>
            semitic-search.andy-barr.com
          </div>
        </div>
      </div>
    ),
    size,
  );
}
