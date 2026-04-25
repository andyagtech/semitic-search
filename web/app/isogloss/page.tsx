import Link from "next/link";
import { IsoglossMap } from "./IsoglossMap";

export const metadata = {
  title: "Isogloss map — Semitic Search",
  description:
    "Interactive map of the Semitic-speaking world colored by which languages preserve or merge each Proto-Semitic phoneme.",
};

export default function IsoglossPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Isogloss map
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-2xl">
            Pick a Proto-Semitic phoneme below to see how each language in the
            family treats it. Green = preserved; amber = merged with another
            phoneme; gray = lost from the inventory. Coordinates are rough
            centroids of the traditional speech-area, not modern distribution.
          </p>
        </header>
        <IsoglossMap />
      </div>
    </main>
  );
}
