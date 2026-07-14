import Link from "next/link";
import type { Metadata } from "next";
import fs from "node:fs/promises";
import path from "node:path";

export const metadata: Metadata = {
  title: "Semitic Stretch Fonts — download",
  description: "Custom Semitic-script fonts with kashida-style widening ligatures and centered mark positioning. 19 fonts covering Hebrew, Syriac, and Ethiopic. Free download.",
};

type FontEntry = {
  file: string;
  family: string;
  script: string;
  source_font: string;
  source_url: string;
  license: "OFL" | "GPL-2.0";
  trigger?: string;
  widened_letters?: string[];
  notes?: string;
};

type Manifest = {
  name: string;
  description: string;
  version: string;
  trigger_codepoints: Record<string, string>;
  fonts: FontEntry[];
};

async function loadManifest(): Promise<Manifest> {
  const p = path.join(process.cwd(), "public", "data", "font_manifest.json");
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw) as Manifest;
}

export default async function FontsPage() {
  const manifest = await loadManifest();
  const byScript: Record<string, FontEntry[]> = {};
  for (const f of manifest.fonts) {
    (byScript[f.script] ||= []).push(f);
  }
  const scriptOrder = ["Hebrew", "Syriac", "Ethiopic (Ge'ez)"];

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <Link href="/font-lab" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Font Lab
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Semitic Stretch Fonts
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-2xl">
            {manifest.description} <b>{manifest.fonts.length} fonts</b> covering{" "}
            Hebrew, Syriac, and Ethiopic. Free to use — each font retains its
            upstream license (OFL or GPL-2.0). Source repo:{" "}
            <a
              href="https://github.com/andyagtech/semitic-stretch-fonts"
              className="underline hover:text-neutral-900"
              target="_blank"
              rel="noreferrer"
            >
              github.com/andyagtech/semitic-stretch-fonts
            </a>
          </p>
        </header>

        <div className="mb-6 bg-white border border-neutral-200 rounded-lg p-4 text-sm text-neutral-700 space-y-2">
          <div><b>How to use:</b> insert the trigger character N times after a stretchable letter and the font substitutes a widened variant via GSUB.</div>
          <ul className="list-disc ml-5 space-y-1 text-neutral-600">
            <li><b>Hebrew:</b> trigger <code className="bg-neutral-100 px-1">U+05C6</code> (Hebrew Punctuation Nun Hafukha)</li>
            <li><b>Syriac + Ethiopic:</b> trigger <code className="bg-neutral-100 px-1">U+2060</code> (Word Joiner — script=Common so it stays in the run)</li>
          </ul>
        </div>

        {scriptOrder.map((script) => {
          const fonts = byScript[script];
          if (!fonts?.length) return null;
          return (
            <section key={script} className="mb-6 bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
              <h2 className="text-lg font-semibold mb-3">{script}</h2>
              <ul className="space-y-3">
                {fonts.map((f) => {
                  const filename = f.file.split("/").pop() ?? f.file;
                  return (
                    <li key={f.file} className="border border-neutral-100 rounded p-3">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap">
                        <div>
                          <div className="font-medium">{f.family}</div>
                          <div className="text-xs text-neutral-500 mt-0.5">
                            Derived from{" "}
                            <a href={f.source_url} className="underline hover:text-neutral-800" target="_blank" rel="noreferrer">
                              {f.source_font}
                            </a>
                            {" · "}
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                              f.license === "OFL" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                              "bg-sky-50 text-sky-800 border border-sky-200"
                            }`}>{f.license}</span>
                          </div>
                          {f.notes && (
                            <div className="text-xs text-neutral-600 mt-1">{f.notes}</div>
                          )}
                        </div>
                        <a
                          href={`/fonts/${filename}`}
                          download
                          className="text-xs px-3 py-1.5 rounded bg-neutral-900 text-white hover:bg-neutral-800 whitespace-nowrap"
                          aria-label={`Download ${f.family}`}
                        >
                          ↓ Download .ttf
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <div className="text-xs text-neutral-500 mt-6">
          v{manifest.version} — full source, build script, and per-font LICENSE
          sidecars at the GitHub repo linked above.
        </div>
      </div>
    </main>
  );
}
