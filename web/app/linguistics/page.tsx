import Link from "next/link";
import { readFileSync } from "fs";
import path from "path";

// Canonical reflexes of key Proto-Semitic consonants across 9 well-documented
// Semitic varieties. Sourced from Lipiński (2001), Huehnergard (2000),
// Moscati (1964); where scholarly consensus has a split, we pick the most
// common reflex and note it in the label. This table is the "textbook
// answer" — cross-reference against /linguistics empirical weights below.
//
// Columns are PS consonants; rows are surviving Semitic languages.
// "=" (identity) is highlighted when the language preserves the PS phoneme
// distinctively; anything else represents a merger (different PS consonants
// collapse to the same surface reflex in that language).
const PS_PHONEMES = ["*ṯ", "*ḏ", "*ḍ", "*ẓ", "*ḫ", "*ġ", "*ś", "*š", "*ṣ"];
type LangReflex = { code: string; name: string; cells: Record<string, string> };
const REFLEX_MATRIX: LangReflex[] = [
  { code: "akk", name: "Akkadian",
    cells: { "*ṯ": "š", "*ḏ": "z", "*ḍ": "ṣ", "*ẓ": "ṣ", "*ḫ": "ḫ", "*ġ": "-", "*ś": "š", "*š": "š", "*ṣ": "ṣ" } },
  { code: "ug",  name: "Ugaritic",
    cells: { "*ṯ": "ṯ", "*ḏ": "ḏ", "*ḍ": "ṣ", "*ẓ": "ẓ", "*ḫ": "ḫ", "*ġ": "ġ", "*ś": "ś/š", "*š": "š", "*ṣ": "ṣ" } },
  { code: "ar",  name: "Arabic",
    cells: { "*ṯ": "ṯ", "*ḏ": "ḏ", "*ḍ": "ḍ", "*ẓ": "ẓ", "*ḫ": "ḫ", "*ġ": "ġ", "*ś": "š", "*š": "s", "*ṣ": "ṣ" } },
  { code: "he",  name: "Hebrew",
    cells: { "*ṯ": "š", "*ḏ": "z", "*ḍ": "ṣ", "*ẓ": "ṣ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "ś", "*š": "š", "*ṣ": "ṣ" } },
  { code: "syc", name: "Syriac",
    cells: { "*ṯ": "t", "*ḏ": "d", "*ḍ": "ʿ", "*ẓ": "ṭ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "s", "*š": "š", "*ṣ": "ṣ" } },
  { code: "arc", name: "Imperial Aramaic",
    cells: { "*ṯ": "t", "*ḏ": "d", "*ḍ": "q/ʿ", "*ẓ": "ṭ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "s", "*š": "š", "*ṣ": "ṣ" } },
  { code: "gez", name: "Ge'ez",
    cells: { "*ṯ": "s", "*ḏ": "z", "*ḍ": "ḍ", "*ẓ": "ṣ", "*ḫ": "ḫ", "*ġ": "ʿ", "*ś": "ś", "*š": "s", "*ṣ": "ṣ" } },
  { code: "sab", name: "Sabaean",
    cells: { "*ṯ": "ṯ", "*ḏ": "ḏ", "*ḍ": "ḍ", "*ẓ": "ẓ", "*ḫ": "ḫ", "*ġ": "ġ", "*ś": "ś", "*š": "s₁", "*ṣ": "ṣ" } },
  { code: "phn", name: "Phoenician",
    cells: { "*ṯ": "š", "*ḏ": "z", "*ḍ": "ṣ", "*ẓ": "ṣ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "s", "*š": "š", "*ṣ": "ṣ" } },
];

export const metadata = {
  title: "Sound correspondences — Semitic Search",
  description:
    "Empirical Proto-Semitic reflex table derived from editor-curated cognate claims: how each surface phoneme maps between Semitic languages.",
};

type Row = { src_lang: string; src_phoneme: string; tgt_lang: string; tgt_phoneme: string; prob: number };

const LANG_NAMES: Record<string, string> = {
  ar: "Arabic", he: "Hebrew", syc: "Syriac", am: "Amharic", ti: "Tigrinya",
  gez: "Ge'ez", ug: "Ugaritic", akk: "Akkadian", arc: "Imperial Aramaic",
  aii: "Assyrian NA", sab: "Sabaean", osa: "OSA", phn: "Phoenician",
  pun: "Punic", tru: "Turoyo", mid: "Mandaic", amw: "Western NA",
};

function loadRows(): Row[] {
  const p = path.join(process.cwd(), "public", "data", "reflex_weights.json");
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return [];
  }
}

export default function LinguisticsPage() {
  const rows = loadRows();
  // Group by (src_lang, tgt_lang) pair.
  const pairs: Record<string, Row[]> = {};
  for (const r of rows) {
    const key = `${r.src_lang}→${r.tgt_lang}`;
    (pairs[key] = pairs[key] ?? []).push(r);
  }
  // Sort each pair: by src_phoneme, then descending prob.
  for (const k of Object.keys(pairs)) {
    pairs[k].sort((a, b) => a.src_phoneme.localeCompare(b.src_phoneme) || b.prob - a.prob);
  }
  const pairKeys = Object.keys(pairs).sort();

  // Compute self-consistency: fraction of rows where src_phoneme == tgt_phoneme.
  const identity = rows.filter((r) => r.src_phoneme === r.tgt_phoneme).length;
  const total = rows.length;

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Sound correspondences
          </h1>
          <p className="text-neutral-600 mt-3 text-sm">
            Empirical reflex table derived from {total} observed phoneme-pairs
            across the 164 usable editor-curated cognate claims. Each row reads:
            &ldquo;when the left language has this surface phoneme, the right
            language&rsquo;s cognate tends to have that phoneme&rdquo;. Identity
            correspondences make up {Math.round((identity / Math.max(total, 1)) * 100)}%
            — the rest are the Proto-Semitic sound changes that matter for
            cross-script cognate discovery.
          </p>
        </header>

        <section className="mb-8 bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
          <header className="mb-3 pb-2 border-b border-neutral-100">
            <h2 className="text-xl font-semibold">Proto-Semitic reflex matrix</h2>
            <p className="text-xs text-neutral-600 mt-1">
              How each Semitic language realizes the nine key Proto-Semitic
              consonants that split differently across branches. Dashed cell
              means the phoneme was lost or merged out of the inventory. Where
              two reflexes are listed, the split is conditional
              (position / environment). Sources: Lipiński (2001), Huehnergard
              (2000), Moscati (1964).
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="text-sm font-mono border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs text-neutral-500 font-normal px-2 py-1 border-b border-neutral-200">lang</th>
                  {PS_PHONEMES.map((p) => (
                    <th key={p} className="text-center text-xs text-neutral-700 font-semibold px-2 py-1 border-b border-neutral-200 min-w-12">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REFLEX_MATRIX.map((row) => (
                  <tr key={row.code} className="border-b border-neutral-100 last:border-b-0">
                    <td className="px-2 py-1 text-xs">
                      <span className="font-medium">{row.name}</span>
                      <span className="ml-1 text-neutral-400">{row.code}</span>
                    </td>
                    {PS_PHONEMES.map((p) => {
                      const reflex = row.cells[p] ?? "?";
                      const bare = p.replace("*", "");
                      const isIdentity = reflex === bare || reflex.startsWith(bare);
                      return (
                        <td
                          key={p}
                          className={`px-2 py-1 text-center ${isIdentity
                            ? "bg-emerald-50 text-emerald-900 font-semibold"
                            : reflex === "-"
                              ? "bg-neutral-100 text-neutral-400"
                              : "bg-amber-50 text-amber-900"}`}
                        >
                          {reflex}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs text-neutral-500 flex gap-4 flex-wrap">
            <span><span className="inline-block w-3 h-3 bg-emerald-50 border border-emerald-200 rounded-sm mr-1" />preserved</span>
            <span><span className="inline-block w-3 h-3 bg-amber-50 border border-amber-200 rounded-sm mr-1" />merged with another phoneme</span>
            <span><span className="inline-block w-3 h-3 bg-neutral-100 border border-neutral-200 rounded-sm mr-1" />lost</span>
          </div>
        </section>

        {(() => {
          // Lang-pair intensity grid: for each ordered (src, tgt) pair,
          // count how many phoneme observations we have from editor claims.
          // Visual density = quality of evidence for that pair.
          const langSet = new Set<string>();
          const pairCounts: Record<string, number> = {};
          for (const r of rows) {
            langSet.add(r.src_lang);
            langSet.add(r.tgt_lang);
            const k = `${r.src_lang}|${r.tgt_lang}`;
            pairCounts[k] = (pairCounts[k] ?? 0) + 1;
          }
          const langs = [...langSet].sort();
          if (langs.length === 0) return null;
          const maxCount = Math.max(...Object.values(pairCounts), 1);
          return (
            <section className="mb-8 bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
              <header className="mb-3 pb-2 border-b border-neutral-100">
                <h2 className="text-xl font-semibold">Evidence density grid</h2>
                <p className="text-xs text-neutral-600 mt-1">
                  How many phoneme observations connect each source → target
                  language pair. Cells are colored by density — dark = more
                  evidence. Blank cells mean no editor claims cover that direction.
                </p>
              </header>
              <div className="overflow-x-auto">
                <table className="text-sm font-mono border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left text-xs text-neutral-500 font-normal px-2 py-1">src \ tgt</th>
                      {langs.map((l) => (
                        <th key={l} className="text-center text-xs text-neutral-700 font-semibold px-2 py-1 min-w-10">
                          {l}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {langs.map((src) => (
                      <tr key={src}>
                        <td className="px-2 py-1 text-xs font-semibold text-neutral-700">{src}</td>
                        {langs.map((tgt) => {
                          if (src === tgt) {
                            return <td key={tgt} className="text-center text-neutral-300 bg-neutral-50">—</td>;
                          }
                          const count = pairCounts[`${src}|${tgt}`] ?? 0;
                          if (count === 0) return <td key={tgt} className="text-center text-neutral-200">·</td>;
                          const intensity = count / maxCount;
                          const bg = `rgba(59, 130, 246, ${0.15 + 0.7 * intensity})`;
                          return (
                            <td
                              key={tgt}
                              className="text-center text-xs font-mono"
                              style={{ backgroundColor: bg, color: intensity > 0.5 ? "white" : "#1e3a8a" }}
                              title={`${count} observations (${src} → ${tgt})`}
                            >
                              {count}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })()}

        <h2 className="text-lg font-semibold mb-3">Empirical reflex weights from editor claims</h2>
        <div className="space-y-5">
          {pairKeys.map((k) => {
            const items = pairs[k];
            const [src, tgt] = k.split("→");
            return (
              <section key={k} className="bg-white border border-neutral-200 rounded-lg p-4">
                <header className="mb-2 pb-2 border-b border-neutral-100 flex items-baseline justify-between">
                  <h2 className="font-semibold">
                    {LANG_NAMES[src] ?? src} → {LANG_NAMES[tgt] ?? tgt}
                  </h2>
                  <span className="text-xs text-neutral-500 font-mono">
                    {items.length} observation{items.length === 1 ? "" : "s"}
                  </span>
                </header>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-neutral-500 text-left">
                      <th className="font-normal py-1 w-24">{src}</th>
                      <th className="font-normal py-1 w-8 text-center">→</th>
                      <th className="font-normal py-1 w-24">{tgt}</th>
                      <th className="font-normal py-1">probability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r, i) => {
                      const isIdent = r.src_phoneme === r.tgt_phoneme;
                      return (
                        <tr key={i} className="border-t border-neutral-100">
                          <td className="py-1 font-mono">{r.src_phoneme}</td>
                          <td className="py-1 text-center text-neutral-400">→</td>
                          <td className={`py-1 font-mono ${isIdent ? "" : "text-violet-700 font-semibold"}`}>
                            {r.tgt_phoneme}
                          </td>
                          <td className="py-1 font-mono text-xs text-neutral-600">
                            {(r.prob * 100).toFixed(0)}%
                            {!isIdent && (
                              <span className="ml-2 text-[10px] bg-violet-100 text-violet-800 px-1 rounded">reflex</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
