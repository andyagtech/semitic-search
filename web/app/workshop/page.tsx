import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Workshop — Semitic Search",
  description:
    "Internal tools for tuning stretch fonts, inspecting glyph anatomy, debugging bidirectional text, and comparing renderings.",
  robots: { index: false, follow: false },
};

type Tool = {
  href: string;
  title: string;
  blurb: string;
};

const TOOLS: Tool[] = [
  {
    href: "/font-lab",
    title: "Font lab",
    blurb:
      "Live playground: pick a font, type any string, drag a slider to see widening variants. The user-facing entry point that also lives under Typography in the main nav.",
  },
  {
    href: "/stretch-debug",
    title: "Stretch grid",
    blurb:
      "Per-font, per-letter grid of every widening variant s1–s16 side by side. Fast visual check for missing glyphs and continuity between variants.",
  },
  {
    href: "/letter-anatomy",
    title: "Letter anatomy",
    blurb:
      "Zoom into a single glyph, label its contours, drag individual points to try overrides before writing them into the font builder config.",
  },
  {
    href: "/font-tuning",
    title: "Mark tuning",
    blurb:
      "Interactive positioner for niqqud and haraka anchors — the values here get baked into GPOS mkmk tables on the next font build.",
  },
  {
    href: "/bidi-debugger",
    title: "BiDi debugger",
    blurb:
      "Shows Unicode Bidirectional Algorithm resolution step by step. Used while investigating the RTL/LTR issues in the tutorial series.",
  },
  {
    href: "/compare",
    title: "Font comparison",
    blurb:
      "Same text rendered in every installed Semitic font at once, for cross-checking shaping and mark placement.",
  },
  {
    href: "/fonts",
    title: "Font gallery",
    blurb: "Catalog of every font shipped with the app and where each file came from.",
  },
];

export default function WorkshopPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
          Semitic Search · Internal
        </p>
        <h1 className="text-3xl font-medium text-neutral-900 mb-2">Workshop</h1>
        <p className="text-neutral-600 mb-8 max-w-prose">
          These are the tools I use to build and tune the stretch fonts and the
          shaping pipeline. They aren&rsquo;t linked from the main nav —
          they&rsquo;re here as a bench, not a product.
        </p>

        <div className="space-y-3">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="block bg-white rounded-lg border border-neutral-200 hover:border-neutral-400 hover:shadow-sm transition p-5"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-lg font-medium text-neutral-900">{t.title}</span>
                <span className="text-xs text-neutral-400 font-mono">{t.href}</span>
              </div>
              <p className="text-sm text-neutral-600 mt-1 max-w-prose">{t.blurb}</p>
            </Link>
          ))}
        </div>

        <footer className="mt-10 text-xs text-neutral-400">
          <Link
            href="/"
            className="underline underline-offset-2 hover:text-neutral-700"
          >
            ← Back to search
          </Link>
        </footer>
      </div>
    </main>
  );
}
