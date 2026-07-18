import Link from "next/link";
import { LetterAnatomy } from "./LetterAnatomy";

export const metadata = {
  title: "Letter anatomy — Semitic Search",
  description:
    "Interactive contour inspector for stretch-font glyphs. Load any stretchable font, pick a codepoint, see every contour rendered with its index, point indices, coordinates, and on/off-curve markers. Overlay INFIX parameter hints (x_cutoff, bar_bottom, bar_top) with live preview so you can partition a letter visually before setting it in the build script.",
};

export default function LetterAnatomyPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <Link
            href="/stretch-debug"
            className="text-sm text-neutral-500 hover:text-neutral-800"
          >
            ← Stretch debug
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Letter anatomy
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-3xl">
            Interactive contour inspector. Pick a codepoint, see every
            contour rendered as its outline with numbered points, on/off-curve
            markers, and coordinates on hover. Sliders for{" "}
            <code className="mx-1 font-mono text-xs bg-neutral-100 px-1 rounded">
              x_cutoff
            </code>
            /
            <code className="mx-1 font-mono text-xs bg-neutral-100 px-1 rounded">
              bar_bottom
            </code>
            /
            <code className="mx-1 font-mono text-xs bg-neutral-100 px-1 rounded">
              bar_top
            </code>{" "}
            colour each point by which side of the INFIX partition it lands
            on. Use it to pick partitions visually before setting them in{" "}
            <code className="mx-1 font-mono text-xs bg-neutral-100 px-1 rounded">
              build_stretch_hebrew_font.py
            </code>
            .
          </p>
        </header>
        <LetterAnatomy />
      </div>
    </main>
  );
}
