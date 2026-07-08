import Link from "next/link";
import { LearnIndex } from "./LearnIndex";

export const metadata = {
  title: "Learning mode — Semitic Search",
  description: "Flashcard-based spaced repetition for Semitic vocabulary.",
};

export default function LearnPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10">
      <nav className="text-sm text-neutral-500 mb-4">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <span>Learning mode</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Learning mode</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl leading-relaxed">
          Flashcards with spaced repetition. Pick a language and a topic — the tool
          shows one concept at a time (English → target language) and adjusts the
          review interval based on how well you knew it. Progress persists in your
          browser, per (language, topic) pair.
        </p>
      </header>

      <LearnIndex />
    </main>
  );
}
