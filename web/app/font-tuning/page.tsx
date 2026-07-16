import Link from "next/link";
import { MarkTuner } from "./MarkTuner";

export const metadata = {
  title: "Mark position tuning — Semitic Search",
  description:
    "Interactively tune the X/Y anchor of every Arabic and Hebrew combining mark on top of Hebrew letters. Live preview using the current deployed font; copy-to-clipboard the Python snippet to paste into build_stretch_hebrew_font.py for the next rebuild.",
};

export default function FontTuningPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <Link href="/font-lab" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Font Lab
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Mark position tuning
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-2xl">
            Adjust the horizontal and vertical anchor of each combining
            mark (Arabic haraka, Hebrew niqqud) as it sits on a Hebrew
            letter. The live preview uses CSS transforms to show the
            proposed offset applied to the CURRENT deployed font — it&apos;s
            a visual sketch, not a final render. When you like the values,
            copy the Python snippet at the bottom and paste it into
            <code className="mx-1 font-mono text-xs bg-neutral-100 px-1 rounded">scripts/build_stretch_hebrew_font.py</code>
            to bake them into the next rebuild.
          </p>
        </header>
        <MarkTuner />
      </div>
    </main>
  );
}
