"use client";

import { useEffect, useMemo, useState } from "react";

// Frank Ruhl widening trigger. Same codepoint the font's GSUB ligatures
// key off — insert N of these after a base letter to fire ligature s{N}.
const TRIG = "׆";

type Letter = {
  code: string;
  name: string;
  klass: string; // widening class
  version: "v1" | "v2";
};

const LETTERS: Letter[] = [
  // v2 — the recently-added set we're debugging
  { code: "ב", name: "bet",      klass: "bar",             version: "v2" },
  { code: "ח", name: "het",      klass: "bar",             version: "v2" },
  { code: "ט", name: "tet",      klass: "bar",             version: "v2" },
  { code: "י", name: "yod",      klass: "bar",             version: "v2" },
  { code: "כ", name: "kaf",      klass: "bar",             version: "v2" },
  { code: "ך", name: "finalkaf", klass: "leg",             version: "v2" },
  { code: "פ", name: "pe",       klass: "bar",             version: "v2" },
  { code: "ף", name: "finalpe",  klass: "bar",             version: "v2" },
  { code: "ק", name: "qof",      klass: "bar",             version: "v2" },
  { code: "צ", name: "tzade",    klass: "bar",             version: "v2" },
  { code: "א", name: "aleph",    klass: "bar",             version: "v2" },
  { code: "ש", name: "shin",     klass: "bar",             version: "v2" },
  { code: "ע", name: "ayin",     klass: "bar",             version: "v2" },
  // v1 — original 6, known-good; regression baseline
  { code: "ד", name: "dalet",    klass: "bar",  version: "v1" },
  { code: "ה", name: "he",       klass: "leg",  version: "v1" },
  { code: "ל", name: "lamed",    klass: "arm",  version: "v1" },
  { code: "ם", name: "finalmem", klass: "box",  version: "v1" },
  { code: "ר", name: "resh",     klass: "bar",  version: "v1" },
  { code: "ת", name: "tav",      klass: "leg",  version: "v1" },
];

const MAX_LEVEL = 16;
// Base family name — the actual @font-face family is suffixed with a
// per-mount timestamp so the browser cannot serve a stale FontFace
// (see useLoadStretchFont for details).
const FONT_FAMILY_BASE = "FL_StretchHebrew_Debug";

const CLASS_TINT: Record<string, string> = {
  bar:              "bg-amber-50 text-amber-900 border-amber-200",
  leg:              "bg-emerald-50 text-emerald-900 border-emerald-200",
  arm:              "bg-sky-50 text-sky-900 border-sky-200",
  box:              "bg-violet-50 text-violet-900 border-violet-200",
  baseline_extend:  "bg-rose-50 text-rose-900 border-rose-200",
};

function useLoadStretchFont(): { ready: boolean; family: string } {
  // A unique family name per mount, plus a unique URL query, so the
  // browser is FORCED to fetch the current bytes and can't fall back
  // to a still-registered FontFace from a previous mount (that trap
  // hit us — `document.fonts` was serving stale bytes even after the
  // .ttf on disk changed, because the family name matched an already-
  // loaded FontFace). The mounted family flows out via `family` so
  // the render can reference the exact instance we just loaded.
  const [state, setState] = useState<{ ready: boolean; family: string }>({
    ready: false,
    family: FONT_FAMILY_BASE,
  });
  useEffect(() => {
    const stamp = Date.now();
    const family = `${FONT_FAMILY_BASE}_${stamp}`;
    const face = new FontFace(
      family,
      `url(/fonts/SemiticStretchHebrew-v2.ttf?v=${stamp}) format("truetype")`,
      { display: "block", unicodeRange: "U+0000-10FFFF" },
    );
    let cancelled = false;
    face
      .load()
      .then((loaded) => {
        if (cancelled) return;
        document.fonts.add(loaded);
        setState({ ready: true, family });
      })
      .catch((e) => {
        console.error("stretch-debug: font load failed", e);
        if (!cancelled) setState({ ready: true, family });
      });
    return () => {
      cancelled = true;
      document.fonts.delete(face);
    };
  }, []);
  return state;
}

// Build one letter's grapheme string at level N. Kept as a helper so
// the row-click and copy button use the same construction.
function stretched(letter: string, level: number): string {
  return letter + TRIG.repeat(Math.max(0, Math.min(MAX_LEVEL, level)));
}

export function StretchDebug() {
  const { ready: fontReady, family: fontFamily } = useLoadStretchFont();
  const [fontSize, setFontSize] = useState(96);
  const [showV1, setShowV1] = useState(true);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [rowLevels, setRowLevels] = useState<Record<string, number>>(() => {
    // Every row starts at its half-way width so the initial view shows
    // widening at once without any clicking. Focus row can be nudged
    // per-letter with the slider.
    const seed: Record<string, number> = {};
    for (const L of LETTERS) seed[L.name] = 8;
    return seed;
  });
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const filtered = useMemo(
    () => LETTERS.filter((L) => showV1 || L.version === "v2"),
    [showV1],
  );

  // Columns: 0, 2, 4, ... 16 (9 discrete widths).
  const columns = useMemo(() => {
    const out: number[] = [];
    for (let n = 0; n <= MAX_LEVEL; n += 2) out.push(n);
    return out;
  }, []);

  const copyRow = async (L: Letter) => {
    const parts = columns.map((n) => stretched(L.code, n));
    const text = parts.join("   ");
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`copied ${L.name} row`);
      setTimeout(() => setCopyStatus(null), 1500);
    } catch {
      setCopyStatus("copy failed");
      setTimeout(() => setCopyStatus(null), 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <section className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-neutral-600">size</span>
            <input
              type="range"
              min={40}
              max={200}
              step={4}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
              className="w-40"
            />
            <span className="tabular-nums text-neutral-500 w-12">{fontSize}px</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showV1}
              onChange={(e) => setShowV1(e.target.checked)}
            />
            <span>show v1 (regression baseline)</span>
          </label>
          <div className="ml-auto text-xs text-neutral-500">
            {fontReady ? "font loaded" : "loading…"}
            {copyStatus ? (
              <span className="ml-3 text-emerald-700">{copyStatus}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-neutral-500">class legend:</span>
          {(Object.keys(CLASS_TINT) as (keyof typeof CLASS_TINT)[]).map((k) => (
            <span
              key={k}
              className={`px-2 py-0.5 rounded border ${CLASS_TINT[k]}`}
            >
              {k}
            </span>
          ))}
        </div>
        <p className="text-xs text-neutral-500">
          Click any cell to jump that row to that width. Drag a row's slider
          for level-by-level control. Hover a column to highlight the same
          width across every letter.
        </p>
      </section>

      {/* Grid */}
      <section className="bg-white border border-neutral-200 rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-xs text-neutral-500 border-b border-neutral-200">
              <th className="text-left px-3 py-2 font-normal">letter</th>
              <th className="text-left px-3 py-2 font-normal">level</th>
              {columns.map((n) => (
                <th
                  key={n}
                  className={`text-center px-2 py-2 font-normal tabular-nums ${
                    hoverCol === n ? "bg-neutral-100" : ""
                  }`}
                >
                  s{n}
                </th>
              ))}
              <th className="text-left px-3 py-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((L) => {
              const activeLevel = rowLevels[L.name] ?? 0;
              return (
                <tr key={L.name} className="border-b border-neutral-100 last:border-0">
                  <td className="align-middle px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-neutral-700 w-16">
                        {L.name}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                          CLASS_TINT[L.klass] ?? "bg-neutral-50 border-neutral-200"
                        }`}
                      >
                        {L.klass}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                          L.version === "v2"
                            ? "bg-neutral-900 text-white border-neutral-900"
                            : "bg-neutral-100 text-neutral-600 border-neutral-200"
                        }`}
                      >
                        {L.version}
                      </span>
                    </div>
                  </td>
                  <td className="align-middle px-3 py-2 w-64">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={MAX_LEVEL}
                        step={1}
                        value={activeLevel}
                        onChange={(e) =>
                          setRowLevels((s) => ({
                            ...s,
                            [L.name]: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-36"
                      />
                      <span className="text-xs tabular-nums text-neutral-500 w-10">
                        s{activeLevel}
                      </span>
                      <button
                        onClick={() => copyRow(L)}
                        className="text-[10px] uppercase tracking-wide text-neutral-500 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-400 rounded px-1.5 py-0.5"
                        title="Copy this row's Unicode text to clipboard"
                      >
                        copy
                      </button>
                    </div>
                  </td>
                  {columns.map((n) => {
                    const isActive = n === activeLevel;
                    const isHover = hoverCol === n;
                    return (
                      <td
                        key={n}
                        onClick={() =>
                          setRowLevels((s) => ({ ...s, [L.name]: n }))
                        }
                        onMouseEnter={() => setHoverCol(n)}
                        onMouseLeave={() => setHoverCol((h) => (h === n ? null : h))}
                        className={`text-center align-middle px-2 py-2 cursor-pointer transition-colors ${
                          isActive
                            ? "bg-amber-100 ring-1 ring-amber-400"
                            : isHover
                            ? "bg-neutral-50"
                            : ""
                        }`}
                        title={`Set ${L.name} to s${n}`}
                      >
                        <div
                          dir="rtl"
                          style={{
                            fontFamily: fontFamily,
                            fontSize: `${fontSize}px`,
                            lineHeight: 1.1,
                          }}
                        >
                          {stretched(L.code, n)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="align-middle px-3 py-2"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Focus preview — one row per letter at its currently-selected level */}
      <section className="bg-white border border-neutral-200 rounded-lg p-4">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-neutral-500">
          <span>focused preview — one row per letter at its slider level</span>
          <span className="font-mono lowercase tracking-normal text-neutral-400">
            trigger: U+05C6
          </span>
        </div>
        <div
          dir="rtl"
          style={{
            fontFamily: fontFamily,
            fontSize: `${fontSize}px`,
            lineHeight: 1.4,
          }}
        >
          {filtered.map((L) => (
            <div key={L.name} className="flex items-baseline gap-4">
              <span
                dir="ltr"
                className="font-mono text-xs text-neutral-400 w-24"
                style={{ fontFamily: "monospace", fontSize: "12px" }}
              >
                {L.name} s{rowLevels[L.name] ?? 0}
              </span>
              <span>{stretched(L.code, rowLevels[L.name] ?? 0)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
