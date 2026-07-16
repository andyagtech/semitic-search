import Link from "next/link";
import { StretchDebug } from "./StretchDebug";

export const metadata = {
  title: "Stretch debug — Semitic Search",
  description:
    "Grid of every stretchable Frank Ruhl letter × togglable widening levels 0-16. Live-loads the deployed Semitic Stretch Hebrew font so any client-side rendering divergence from HarfBuzz surfaces immediately.",
};

export default function StretchDebugPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <Link
            href="/font-lab"
            className="text-sm text-neutral-500 hover:text-neutral-800"
          >
            ← Font Lab
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Stretch debug
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-3xl">
            Grid of every stretchable Frank Ruhl letter across the full
            widening range. Click any cell to jump the whole row to that
            level; use the per-row slider for fine control. Rows are
            colour-tagged by widening class so any regressions in a
            baseline (v1) letter jump out.
          </p>
        </header>
        <StretchDebug />
      </div>
    </main>
  );
}
