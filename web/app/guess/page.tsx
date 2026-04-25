import Link from "next/link";
import { allFamilies } from "@/lib/root_families";
import { GuessGame } from "./GuessGame";

export const metadata = {
  title: "Guess the root — Semitic Search",
  description:
    "Learning game: given a word in one Semitic script, identify the cognate root in another. A playful way to build intuition for Proto-Semitic correspondences.",
};

export default function GuessPage() {
  // Pre-filter: only families with at least 3 languages so we have enough
  // cognate evidence and distractors.
  const families = allFamilies().filter((f) => f.lang_count >= 3);
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Guess the root
          </h1>
          <p className="text-neutral-600 mt-3 text-sm">
            Given a word in one Semitic language, pick the cognate in another.
            Tests your intuition for sound changes and script conversions.
          </p>
        </header>
        <GuessGame families={families} />
      </div>
    </main>
  );
}
