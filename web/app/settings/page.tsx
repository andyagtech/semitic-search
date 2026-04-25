import Link from "next/link";
import { SettingsForm } from "./SettingsForm";

export const metadata = {
  title: "Preferences — Semitic Search",
  description:
    "Set your preferred script / typeface for each Semitic language. The selection persists across sessions and applies everywhere cognates are rendered.",
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Preferences
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-2xl">
            Pick how each language should render by default. Your choices
            are saved in your browser (localStorage) and apply to the home
            page&apos;s cognate results, every <code className="font-mono text-xs">/roots/[slug]</code>
            page, and the comparison views. Per-page toggles still work —
            they override this default for that session.
          </p>
        </header>
        <SettingsForm />
      </div>
    </main>
  );
}
