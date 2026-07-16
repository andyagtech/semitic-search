"use client";

import { useEffect, useMemo, useState } from "react";

// --- Data ----------------------------------------------------------------

type Mark = {
  cp: number;
  ch: string;
  name: string;
  short: string;
  cls: "above" | "below";
  // Current baked-in values (from build_stretch_hebrew_font.py). Users
  // adjust these interactively; the deltas end up in the copyable Python
  // snippet below. NB: these MUST be kept in sync with the build script
  // by hand for the "generate Python" output to be truthful — but even
  // if they drift, the exported snippet is what the user pastes.
  baseXShift: number;    // _MARK_ANCHOR_X_SHIFT default (usually 0)
  baseYAnchor?: number;  // _MARK_ANCHOR_Y_OVERRIDE (only set for overrides)
  anchorAtBottom?: boolean; // in _MARK_ANCHOR_AT_BOTTOM set
};

// Reflect the state of the build script constants at commit time. Update
// when you change the build script defaults.
const MARKS: Mark[] = [
  { cp: 0x064E, ch: "َ", short: "fatha",     name: "Fatha (a)",       cls: "above", baseXShift: 0 },
  { cp: 0x0650, ch: "ِ", short: "kasra",     name: "Kasra (e/i)",     cls: "below", baseXShift: 0 },
  { cp: 0x064F, ch: "ُ", short: "damma",     name: "Damma (o/u)",     cls: "above", baseXShift: 0 },
  { cp: 0x0654, ch: "ٔ", short: "hamza",     name: "Hamza above",     cls: "above", baseXShift: 140, anchorAtBottom: true },
  { cp: 0x0651, ch: "ّ", short: "shadda",    name: "Shadda",          cls: "above", baseXShift: 0 },
  { cp: 0x064B, ch: "ً", short: "fathatan",  name: "Fathatan (an)",   cls: "above", baseXShift: 0 },
  { cp: 0x064C, ch: "ٌ", short: "dammatan",  name: "Dammatan (un)",   cls: "above", baseXShift: 0 },
  { cp: 0x064D, ch: "ٍ", short: "kasratan",  name: "Kasratan (in)",   cls: "below", baseXShift: 0 },
  { cp: 0x0652, ch: "ْ", short: "sukun",     name: "Sukun",           cls: "above", baseXShift: 0 },
  { cp: 0x0653, ch: "ٓ", short: "maddah",    name: "Maddah",          cls: "above", baseXShift: 0 },
  { cp: 0x0670, ch: "ٰ", short: "daggeralif", name: "Dagger alif",     cls: "above", baseXShift: 0 },
  { cp: 0x0308, ch: "̈", short: "diaeresis",  name: "Diaeresis (2-dots)", cls: "above", baseXShift: 0 },
];

// Hebrew letters most-often used as bases in Judeo-Arabic. Order matters
// for the picker; kaf/mem/samekh/alef sit at the front because they
// appear in the canonical showcase.
const HEBREW_BASES: { ch: string; name: string }[] = [
  { ch: "כ", name: "kaf (כ)" },
  { ch: "מ", name: "mem (מ)" },
  { ch: "ס", name: "samekh (ס)" },
  { ch: "א", name: "alef (א)" },
  { ch: "ה", name: "he (ה)" },
  { ch: "ל", name: "lamed (ל)" },
  { ch: "ר", name: "resh (ר)" },
  { ch: "ד", name: "dalet (ד)" },
  { ch: "ב", name: "bet (ב)" },
  { ch: "ת", name: "tav (ת)" },
  { ch: "ם", name: "final mem (ם)" },
  { ch: "ך", name: "final kaf (ך)" },
];

// Hebrew stretch fonts (same list as Font Lab, minus the download-only
// meta). File path is under /fonts/. The @font-face family names line
// up with the Font Lab so we avoid double-registering.
const FONTS = [
  { id: "stretch",              label: "Semitic Stretch Hebrew",              file: "SemiticStretchHebrew.ttf",              family: "FT_StretchHebrew" },
  { id: "stretchketer",         label: "Keter Aram Tsova",                    file: "SemiticStretchKeterAramTsova.ttf",      family: "FT_StretchKeterAram" },
  { id: "stretchshmulik",       label: "Shmulik CLM",                          file: "SemiticStretchShmulikCLM.ttf",          family: "FT_StretchShmulik" },
  { id: "stretchhillel",        label: "Hillel CLM",                           file: "SemiticStretchHillelCLM.ttf",           family: "FT_StretchHillel" },
  { id: "stretchgladia",        label: "Gladia CLM",                           file: "SemiticStretchGladiaCLM.ttf",           family: "FT_StretchGladia" },
  { id: "stretchnotoserif",     label: "Noto Serif Hebrew",                   file: "SemiticStretchNotoSerifHebrew.ttf",     family: "FT_StretchNotoSerifHebrew" },
  { id: "stretchezra",          label: "Ezra SIL SR",                          file: "SemiticStretchEzraSIL.ttf",             family: "FT_StretchEzraSIL" },
];

// --- Component -----------------------------------------------------------

const loadedFamilies = new Set<string>();
function ensureFontLoaded(family: string, file: string) {
  if (typeof document === "undefined") return;
  if (loadedFamilies.has(family)) return;
  const bust = `?v=${Date.now()}`;
  const style = document.createElement("style");
  style.textContent = `@font-face { font-family: '${family}'; src: url('/fonts/${file}${bust}') format('truetype'); font-display: block; unicode-range: U+0000-10FFFF; }`;
  document.head.appendChild(style);
  loadedFamilies.add(family);
}

function cpHex(cp: number) {
  return "0x" + cp.toString(16).toUpperCase().padStart(4, "0");
}

type Deltas = Record<number, { dx: number; dy: number }>;

export function MarkTuner() {
  const [fontId, setFontId] = useState(FONTS[0].id);
  const [baseCh, setBaseCh] = useState("א");
  const [deltas, setDeltas] = useState<Deltas>({});
  const font = FONTS.find((f) => f.id === fontId) ?? FONTS[0];

  useEffect(() => {
    ensureFontLoaded(font.family, font.file);
  }, [font]);

  const bump = (cp: number, dx: number, dy: number) => {
    setDeltas((prev) => {
      const cur = prev[cp] ?? { dx: 0, dy: 0 };
      return { ...prev, [cp]: { dx: cur.dx + dx, dy: cur.dy + dy } };
    });
  };
  const reset = (cp: number) => {
    setDeltas((prev) => {
      const { [cp]: _drop, ...rest } = prev;
      return rest;
    });
  };
  const resetAll = () => setDeltas({});

  // Python code snippet reflecting current baked + delta values. User
  // pastes this into build_stretch_hebrew_font.py in place of the
  // corresponding constants, then rebuilds all Hebrew stretch fonts.
  const snippet = useMemo(() => {
    const xShiftLines: string[] = [];
    for (const m of MARKS) {
      const total = m.baseXShift + (deltas[m.cp]?.dx ?? 0);
      if (total !== 0) {
        xShiftLines.push(`    ${cpHex(m.cp)}: ${total},  # ${m.short}`);
      }
    }
    const yLines: string[] = [];
    for (const m of MARKS) {
      const dy = deltas[m.cp]?.dy ?? 0;
      // Baseline Y is class-defined (801 above, -327 below); dy is a
      // delta on top. Emit only when dy != 0.
      if (dy !== 0) {
        const base = m.cls === "above" ? 801 : -327;
        yLines.push(`    ${cpHex(m.cp)}: ${base + dy},  # ${m.short} (${m.cls} base ${base} + ${dy})`);
      }
    }
    return `# --- Paste into scripts/build_stretch_hebrew_font.py ---

_MARK_ANCHOR_X_SHIFT: dict[int, int] = {
${xShiftLines.join("\n") || "    # (all defaults)"}
}

_ARABIC_MARK_ANCHOR_Y_OVERRIDE: dict[int, int] = {
${yLines.join("\n") || "    # (all defaults)"}
}

# Then rebuild all Hebrew stretch fonts:
#   .venv/bin/python -c "import sys; sys.path.insert(0,'scripts'); \\
#     import build_stretch_hebrew_font as b; \\
#     [b.build_one(c) for c in b.CONFIGS if c.get('import_marks')]"`;
  }, [deltas]);

  const copyToClipboard = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(snippet);
    }
  };

  const fontStyle = { fontFamily: `'${font.family}', serif` };

  return (
    <div className="space-y-6">
      {/* Font + base picker */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="text-neutral-600 uppercase tracking-wider">Font</span>
            <select
              value={fontId}
              onChange={(e) => setFontId(e.target.value)}
              className="mt-1 w-full px-2 py-1.5 rounded border border-neutral-300 text-sm bg-white"
            >
              {FONTS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="text-neutral-600 uppercase tracking-wider">Base letter</span>
            <select
              value={baseCh}
              onChange={(e) => setBaseCh(e.target.value)}
              className="mt-1 w-full px-2 py-1.5 rounded border border-neutral-300 text-sm bg-white"
            >
              {HEBREW_BASES.map((b) => (
                <option key={b.ch} value={b.ch}>{b.name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Per-mark row: preview + X/Y controls + current delta */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-800">
            Mark positioning
          </h2>
          <button
            type="button"
            onClick={resetAll}
            className="text-xs px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700"
            disabled={Object.keys(deltas).length === 0}
          >
            Reset all deltas
          </button>
        </header>
        <p className="text-xs text-neutral-600 mb-4">
          The FONT column is the actual rendered <span dir="rtl" style={fontStyle}>{baseCh}</span>{" "}
          with the mark baked in. The CSS OVERLAY column shows the same
          text with the current delta applied via <code>transform: translate()</code>{" "}
          — a visual sketch of what a rebuild with the proposed X/Y shifts
          would look like. Copy the snippet at the bottom to bake the
          shifts into the font.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-600 uppercase tracking-wider text-[10px]">
                <th className="py-2 px-2 text-left">Mark</th>
                <th className="py-2 px-2 text-center">Font (baked)</th>
                <th className="py-2 px-2 text-center">CSS overlay preview</th>
                <th className="py-2 px-2 text-center">X shift</th>
                <th className="py-2 px-2 text-center">Y shift</th>
                <th className="py-2 px-2 text-center">Reset</th>
              </tr>
            </thead>
            <tbody>
              {MARKS.map((m) => {
                const d = deltas[m.cp] ?? { dx: 0, dy: 0 };
                const totalXShift = m.baseXShift + d.dx;
                // Convert font units to px assuming UPM=1000 and 72px
                // preview. +X in font-shift-space → visually LEFT via
                // (base_x - mark_x). CSS translate(-Npx) moves left.
                const pxScale = 72 / 1000;
                const cssTx = -totalXShift * pxScale;
                // Y shift: positive = further UP visually.
                const cssTy = -d.dy * pxScale;
                return (
                  <tr key={m.cp} className="border-b border-neutral-100">
                    <td className="py-3 px-2">
                      <div className="text-lg font-mono">{m.short}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {cpHex(m.cp)} · {m.cls}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        dir="rtl"
                        style={{ ...fontStyle, fontSize: 56, lineHeight: 1.2 }}
                        title="What the currently-deployed font renders"
                      >
                        {baseCh}{m.ch}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        dir="rtl"
                        className="relative inline-block"
                        style={{ ...fontStyle, fontSize: 56, lineHeight: 1.2 }}
                        title="Current font render + delta applied via CSS transform"
                      >
                        {baseCh}
                        <span
                          style={{
                            display: "inline-block",
                            transform: `translate(${cssTx}px, ${cssTy}px)`,
                          }}
                        >
                          {m.ch}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => bump(m.cp, -20, 0)}
                          className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-xs"
                          title="Shift 20 units right (dx -20) — visually moves mark right"
                        >−</button>
                        <span className="min-w-[3ch] font-mono text-neutral-700">
                          {totalXShift}
                        </span>
                        <button
                          type="button"
                          onClick={() => bump(m.cp, 20, 0)}
                          className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-xs"
                          title="Shift 20 units left (dx +20) — visually moves mark left"
                        >+</button>
                      </div>
                      {d.dx !== 0 && (
                        <div className="text-[10px] text-emerald-700 mt-0.5">
                          Δ {d.dx > 0 ? "+" : ""}{d.dx}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => bump(m.cp, 0, -20)}
                          className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-xs"
                          title="Shift 20 units DOWN"
                        >↓</button>
                        <span className="min-w-[3ch] font-mono text-neutral-700">
                          {d.dy}
                        </span>
                        <button
                          type="button"
                          onClick={() => bump(m.cp, 0, 20)}
                          className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-xs"
                          title="Shift 20 units UP"
                        >↑</button>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => reset(m.cp)}
                        className="text-xs px-1.5 py-0.5 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-600"
                        disabled={d.dx === 0 && d.dy === 0}
                      >
                        ⟲
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Copy-to-clipboard Python snippet */}
      <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-emerald-900">
            Python snippet — paste into build_stretch_hebrew_font.py
          </h2>
          <button
            type="button"
            onClick={copyToClipboard}
            className="text-xs px-3 py-1.5 rounded border border-emerald-400 bg-white hover:bg-emerald-100 text-emerald-800 font-medium"
          >
            📋 Copy
          </button>
        </div>
        <p className="text-xs text-emerald-900 mb-2">
          Only shows the marks that have non-default X/Y shifts (either
          the baked-in ones from the current build or your interactive
          deltas). Paste both dicts into <code className="font-mono">scripts/build_stretch_hebrew_font.py</code>,
          replacing the existing definitions, then rebuild the Hebrew
          stretch fonts as shown at the bottom of the snippet.
        </p>
        <pre className="font-mono text-[11px] bg-white border border-emerald-200 rounded p-3 overflow-x-auto whitespace-pre">
{snippet}
        </pre>
      </section>
    </div>
  );
}
