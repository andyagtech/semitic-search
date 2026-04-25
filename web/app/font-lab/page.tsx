import Link from "next/link";
import { FontLab } from "./FontLab";

export const metadata = {
  title: "Font lab — Semitic Search",
  description:
    "Convert text in any Semitic script to a styleable SVG. Per-letter coloring, multiple typefaces, download as SVG. Arabic, Hebrew, Syriac, Ethiopic, cuneiform, Ugaritic, Phoenician, OSA.",
};

export default function FontLabPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Font lab
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-2xl">
            Type in any Semitic script, pick a typeface, and convert the text
            to a vector SVG you can color letter-by-letter and download.
            Adapted from Andy&apos;s <code className="font-mono bg-neutral-100 px-1 rounded">arabic_font_tests</code>
            prototype and extended to all 10 scripts used by the 17 Semitic
            languages in this corpus.
          </p>
        </header>
        <FontLab />
      </div>
    </main>
  );
}
