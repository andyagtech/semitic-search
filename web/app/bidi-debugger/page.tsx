import Link from "next/link";
import { BidiDebugger } from "./BidiDebugger";

export const metadata = {
  title: "BiDi debugger — Semitic Search",
  description:
    "Debug mixed-direction (LTR + RTL) text. Visual vs logical order, invisible bidi controls highlighted, per-character inspector, and a 'wrap for safe paste' fixer.",
};

export default function BidiDebuggerPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <Link href="/font-lab" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Font Lab
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            BiDi debugger
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-2xl">
            Paste any text mixing left-to-right and right-to-left scripts
            (English + Arabic, code + Hebrew comments, quoted Persian in an
            English paragraph). See how the browser reorders it visually,
            spot the invisible bidi controls that make copy+paste flip
            unpredictably, and wrap the string with implicit isolates so it
            renders the same everywhere.
          </p>
        </header>
        <BidiDebugger />
      </div>
    </main>
  );
}
