"use client";

import { useEffect, useMemo, useState } from "react";

type Letter = {
  code: string;
  name: string;
  klass: string; // widening class
  version?: "v1" | "v2";
};

type StretchFont = {
  id: string;
  label: string;
  file: string;
  // undefined → every letter widens (used by Arabic tatweel, which works on any joiner)
  letters?: Set<string>;
};

type Script = {
  id: "hebrew" | "syriac" | "arabic";
  label: string;
  trigger: string;      // codepoint inserted to widen
  triggerLabel: string; // e.g. "U+05C6"
  letters: Letter[];
  fonts: StretchFont[];
  // Optional supplementary note shown under the controls
  note?: string;
};

// ─── Hebrew ────────────────────────────────────────────────────────────
// Frank Ruhl and 13 other Hebrew stretch fonts. Trigger: U+05C6 Hebrew
// Punctuation Nun Hafukha. See build_stretch_fonts.py.
const HEB_LETTERS: Letter[] = [
  { code: "ב", name: "bet",      klass: "bar", version: "v2" },
  { code: "ח", name: "het",      klass: "bar", version: "v2" },
  { code: "ט", name: "tet",      klass: "bar", version: "v2" },
  { code: "י", name: "yod",      klass: "bar", version: "v2" },
  { code: "כ", name: "kaf",      klass: "bar", version: "v2" },
  { code: "ך", name: "finalkaf", klass: "leg", version: "v2" },
  { code: "פ", name: "pe",       klass: "bar", version: "v2" },
  { code: "ף", name: "finalpe",  klass: "bar", version: "v2" },
  { code: "ק", name: "qof",      klass: "bar", version: "v2" },
  { code: "צ", name: "tzade",    klass: "bar", version: "v2" },
  { code: "א", name: "aleph",    klass: "bar", version: "v2" },
  { code: "ש", name: "shin",     klass: "bar", version: "v2" },
  { code: "ע", name: "ayin",     klass: "bar", version: "v2" },
  { code: "ד", name: "dalet",    klass: "bar", version: "v1" },
  { code: "ה", name: "he",       klass: "leg", version: "v1" },
  { code: "ל", name: "lamed",    klass: "arm", version: "v1" },
  { code: "ם", name: "finalmem", klass: "box", version: "v1" },
  { code: "ר", name: "resh",     klass: "bar", version: "v1" },
  { code: "ת", name: "tav",      klass: "leg", version: "v1" },
];
const HEB_BASE = new Set(["ד", "ה", "ל", "ם", "ר", "ת"]);
const HEB_COMPLEX_10 = ["ב","ח","ט","י","ך","כ","ף","פ","צ","ק"];
const HEB_ALL = new Set([...HEB_BASE, ...HEB_COMPLEX_10, "א","ש","ע"]);
const heb_withComplex = () => new Set([...HEB_BASE, ...HEB_COMPLEX_10]);
const HEB_FONTS: StretchFont[] = [
  { id: "frank-ruhl", label: "Frank Ruhl", file: "SemiticStretchHebrew-v2.ttf", letters: HEB_ALL },
  { id: "noto-sans-heb", label: "Noto Sans Hebrew", file: "SemiticStretchNotoSansHebrew.ttf",
    letters: new Set([...HEB_BASE, "ב","ח","ט","י","ך","כ","צ","ק"]) },
  { id: "noto-serif-heb", label: "Noto Serif Hebrew", file: "SemiticStretchNotoSerifHebrew.ttf", letters: heb_withComplex() },
  { id: "gladia",     label: "Gladia CLM",       file: "SemiticStretchGladiaCLM.ttf",       letters: heb_withComplex() },
  { id: "keter",      label: "Keter Aram Tsova", file: "SemiticStretchKeterAramTsova.ttf",  letters: heb_withComplex() },
  { id: "hillel",     label: "Hillel CLM",       file: "SemiticStretchHillelCLM.ttf",       letters: heb_withComplex() },
  { id: "shofar",     label: "Shofar",           file: "SemiticStretchShofar.ttf",          letters: heb_withComplex() },
  { id: "freemono",   label: "FreeMono",         file: "SemiticStretchFreeMono.ttf",        letters: heb_withComplex() },
  { id: "nachlieli",  label: "Nachlieli CLM",    file: "SemiticStretchNachlieliCLM.ttf",    letters: heb_withComplex() },
  { id: "miriammono", label: "Miriam Mono CLM",  file: "SemiticStretchMiriamMonoCLM.ttf",   letters: heb_withComplex() },
  { id: "ezrasil",    label: "Ezra SIL SR",      file: "SemiticStretchEzraSIL.ttf",         letters: heb_withComplex() },
  { id: "stam",       label: "Stam Ashkenaz CLM",file: "SemiticStretchStamAshkenazCLM.ttf", letters: heb_withComplex() },
  { id: "shlomo",     label: "Shlomo SemiStam",  file: "SemiticStretchShlomoSemiStam.ttf",  letters: heb_withComplex() },
  { id: "rashi",      label: "Rashi",            file: "SemiticStretchRashi.ttf",
    letters: new Set([...HEB_BASE, "ב","ח","ט","י","ך","כ","ף","פ","ק"]) },
];

// ─── Assyrian (Syriac) ─────────────────────────────────────────────────
// Trigger: U+070D SYRIAC HARKLEAN ASTERISCUS. Real Syriac codepoint,
// joining_type=Non-joining, Base class — survives Chromium's shaper.
const SYR_LETTERS: Letter[] = [
  { code: "ܐ", name: "alaph",    klass: "bar" },
  { code: "ܒ", name: "beth",     klass: "bar" },
  { code: "ܕ", name: "dalath",   klass: "bar" },
  { code: "ܗ", name: "he",       klass: "bar" },
  { code: "ܘ", name: "waw",      klass: "bar" },
  { code: "ܡ", name: "mim",      klass: "bar" },
  { code: "ܣ", name: "semkath",  klass: "bar" },
  { code: "ܪ", name: "rish",     klass: "bar" },
  { code: "ܫ", name: "shin",     klass: "bar" },
  { code: "ܬ", name: "taw",      klass: "leg" },
];
const SYR_QUAD = new Set(["ܒ","ܕ","ܪ","ܬ"]);
const SYR_PAIR = new Set(["ܕ","ܪ"]);  // Noto Sans Syriac restricted to right-joining letters
const SYR_TEN = new Set(["ܐ","ܒ","ܕ","ܗ","ܘ","ܡ","ܣ","ܪ","ܫ","ܬ"]);
const SYR_FONTS: StretchFont[] = [
  { id: "ramsina",       label: "Ramsina (cursive)",             file: "SemiticStretchRamsina.ttf",        letters: SYR_QUAD },
  { id: "noto-sans-syr", label: "Noto Sans Syriac (cursive)",    file: "SemiticStretchNotoSansSyriac.ttf", letters: SYR_PAIR },
  { id: "nohadra-sapna", label: "Nohadra Sapna (block)",         file: "SemiticStretchNohadraSapna.ttf",   letters: SYR_TEN },
  { id: "nohadra-amedia",label: "Nohadra Amedia (block)",        file: "SemiticStretchNohadraAmedia.ttf",  letters: SYR_TEN },
];

// ─── Arabic ────────────────────────────────────────────────────────────
// Trigger: U+0640 ARABIC TATWEEL — native, part of the font, joins into
// the cursive chain. This is what we're comparing our GSUB approach to.
// No custom builds needed; every OpenType Arabic font handles tatweel.
const ARA_LETTERS: Letter[] = [
  { code: "ب", name: "beh",   klass: "tatweel" },
  { code: "ت", name: "teh",   klass: "tatweel" },
  { code: "ث", name: "theh",  klass: "tatweel" },
  { code: "ح", name: "hah",   klass: "tatweel" },
  { code: "س", name: "seen",  klass: "tatweel" },
  { code: "ش", name: "sheen", klass: "tatweel" },
  { code: "ص", name: "sad",   klass: "tatweel" },
  { code: "ط", name: "tah",   klass: "tatweel" },
  { code: "ع", name: "ain",   klass: "tatweel" },
  { code: "ف", name: "feh",   klass: "tatweel" },
  { code: "ق", name: "qaf",   klass: "tatweel" },
  { code: "ك", name: "kaf",   klass: "tatweel" },
  { code: "ل", name: "lam",   klass: "tatweel" },
  { code: "م", name: "meem",  klass: "tatweel" },
  { code: "ن", name: "noon",  klass: "tatweel" },
  { code: "ه", name: "heh",   klass: "tatweel" },
  { code: "ي", name: "yeh",   klass: "tatweel" },
];
const ARA_FONTS: StretchFont[] = [
  { id: "noto-naskh",    label: "Noto Naskh Arabic (traditional)", file: "NotoNaskhArabic.ttf" },
  { id: "amiri",         label: "Amiri (classical Naskh)",         file: "Amiri-Regular.ttf" },
  { id: "noto-sans-ara", label: "Noto Sans Arabic (modern sans)",  file: "NotoSansArabic.ttf" },
  { id: "noto-kufi",     label: "Noto Kufi Arabic (geometric)",    file: "NotoKufiArabic.ttf" },
  { id: "nastaliq",      label: "Noto Nastaliq Urdu (calligraphic)", file: "NotoNastaliqUrdu.ttf" },
];

const SCRIPTS: Script[] = [
  {
    id: "hebrew", label: "Hebrew", trigger: "׆", triggerLabel: "U+05C6",
    letters: HEB_LETTERS, fonts: HEB_FONTS,
    note: "GSUB-ligature widening. Each letter has 16 pre-baked variants; N triggers → variant s{N}. v1 = original 6-letter set; v2 = expanded 13-letter set.",
  },
  {
    id: "syriac", label: "Assyrian (Syriac)", trigger: "܍", triggerLabel: "U+070D",
    letters: SYR_LETTERS, fonts: SYR_FONTS,
    note: "GSUB ligatures on U+070D SYRIAC HARKLEAN ASTERISCUS. Cursive fonts (Ramsina, Noto Sans Syriac) widen 4 right-joining/dual letters — the isolated forms show cleanly; mid-word behavior depends on shaper positional-form ordering. Block fonts (Nohadra) widen all 10 letters uniformly.",
  },
  {
    id: "arabic", label: "Arabic (tatweel comparison)", trigger: "ـ", triggerLabel: "U+0640",
    letters: ARA_LETTERS, fonts: ARA_FONTS,
    note: "Native tatweel — no custom build. The tatweel character is a joining letter that inserts pure horizontal rail into the cursive chain. Contrast to our GSUB approach: each tatweel is a REPEATABLE unit, so extension is unbounded and never caps at s16.",
  },
];

const MAX_LEVEL = 16;
const FONT_FAMILY_BASE = "StretchDebug_Font";

const CLASS_TINT: Record<string, string> = {
  bar:             "bg-amber-50 text-amber-900 border-amber-200",
  leg:             "bg-emerald-50 text-emerald-900 border-emerald-200",
  arm:             "bg-sky-50 text-sky-900 border-sky-200",
  box:             "bg-violet-50 text-violet-900 border-violet-200",
  baseline_extend: "bg-rose-50 text-rose-900 border-rose-200",
  tatweel:         "bg-teal-50 text-teal-900 border-teal-200",
};

function useLoadStretchFont(fontFile: string): { ready: boolean; family: string } {
  const [state, setState] = useState<{ ready: boolean; family: string }>({
    ready: false,
    family: FONT_FAMILY_BASE,
  });
  useEffect(() => {
    const stamp = Date.now();
    const family = `${FONT_FAMILY_BASE}_${stamp}`;
    const face = new FontFace(
      family,
      `url(/fonts/${fontFile}?v=${stamp}) format("truetype")`,
      { display: "block", unicodeRange: "U+0000-10FFFF" },
    );
    let cancelled = false;
    setState({ ready: false, family: FONT_FAMILY_BASE });
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
  }, [fontFile]);
  return state;
}

function stretched(letter: string, level: number, trigger: string): string {
  return letter + trigger.repeat(Math.max(0, Math.min(MAX_LEVEL, level)));
}

export function StretchDebug() {
  const [scriptId, setScriptId] = useState<Script["id"]>("hebrew");
  const script = SCRIPTS.find((s) => s.id === scriptId)!;
  const [fontIdxByScript, setFontIdxByScript] = useState<Record<string, number>>({
    hebrew: 0, syriac: 0, arabic: 0,
  });
  const fontIdx = fontIdxByScript[scriptId] ?? 0;
  const setFontIdx = (i: number) => setFontIdxByScript((s) => ({ ...s, [scriptId]: i }));

  const currentFont = script.fonts[fontIdx] ?? script.fonts[0];
  const { ready: fontReady, family: fontFamily } = useLoadStretchFont(currentFont.file);

  const [fontSize, setFontSize] = useState(96);
  const [showV1, setShowV1] = useState(true);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  // Per-row level state. Seed at s8 (mid-range) so the initial view shows
  // widening on every letter without any clicking.
  const [rowLevelsByScript, setRowLevelsByScript] = useState<Record<string, Record<string, number>>>(() => {
    const seed: Record<string, Record<string, number>> = {};
    for (const s of SCRIPTS) {
      const inner: Record<string, number> = {};
      for (const L of s.letters) inner[L.name] = 8;
      seed[s.id] = inner;
    }
    return seed;
  });
  const rowLevels = rowLevelsByScript[scriptId];
  const setRowLevel = (name: string, level: number) =>
    setRowLevelsByScript((s) => ({
      ...s,
      [scriptId]: { ...s[scriptId], [name]: level },
    }));

  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const filtered = useMemo(
    () => script.letters.filter((L) => {
      const inFontSet = currentFont.letters ? currentFont.letters.has(L.code) : true;
      const passesV1 = showV1 || L.version !== "v1";
      return inFontSet && passesV1;
    }),
    [script, currentFont, showV1],
  );

  // Show v1 toggle only meaningful for Hebrew.
  const showV1Toggle = scriptId === "hebrew";

  const columns = useMemo(() => {
    const out: number[] = [];
    for (let n = 0; n <= MAX_LEVEL; n += 2) out.push(n);
    return out;
  }, []);

  const copyRow = async (L: Letter) => {
    const parts = columns.map((n) => stretched(L.code, n, script.trigger));
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
      {/* Script tabs */}
      <section className="bg-white border border-neutral-200 rounded-lg p-3">
        <div role="tablist" aria-label="Script" className="flex flex-wrap gap-1">
          {SCRIPTS.map((s) => {
            const active = s.id === scriptId;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                onClick={() => setScriptId(s.id)}
                className={`px-4 py-1.5 rounded text-sm border transition ${
                  active
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        {script.note && (
          <p className="text-xs text-neutral-500 mt-3 max-w-4xl leading-relaxed">
            {script.note}
          </p>
        )}
      </section>

      {/* Controls */}
      <section className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-neutral-600">font</span>
            <select
              value={fontIdx}
              onChange={(e) => setFontIdx(parseInt(e.target.value, 10))}
              className="border border-neutral-300 rounded px-2 py-1 text-sm"
            >
              {script.fonts.map((f, i) => (
                <option key={f.id} value={i}>{f.label}</option>
              ))}
            </select>
          </label>
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
          {showV1Toggle && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showV1}
                onChange={(e) => setShowV1(e.target.checked)}
              />
              <span>show v1 (regression baseline)</span>
            </label>
          )}
          <div className="ml-auto text-xs text-neutral-500 flex items-center gap-3">
            <span className="font-mono">trigger: {script.triggerLabel}</span>
            <span>{fontReady ? "font loaded" : "loading…"}</span>
            {copyStatus ? (
              <span className="text-emerald-700">{copyStatus}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-neutral-500">class legend:</span>
          {Array.from(new Set(script.letters.map((L) => L.klass))).map((k) => (
            <span
              key={k}
              className={`px-2 py-0.5 rounded border ${CLASS_TINT[k] ?? "bg-neutral-50 border-neutral-200"}`}
            >
              {k}
            </span>
          ))}
        </div>
        <p className="text-xs text-neutral-500">
          Click any cell to jump that row to that width. Drag a row&rsquo;s
          slider for level-by-level control. Hover a column to highlight the
          same width across every letter.
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
                      {L.version && (
                        <span
                          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                            L.version === "v2"
                              ? "bg-neutral-900 text-white border-neutral-900"
                              : "bg-neutral-100 text-neutral-600 border-neutral-200"
                          }`}
                        >
                          {L.version}
                        </span>
                      )}
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
                        onChange={(e) => setRowLevel(L.name, parseInt(e.target.value, 10))}
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
                        onClick={() => setRowLevel(L.name, n)}
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
                          {stretched(L.code, n, script.trigger)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="align-middle px-3 py-2"></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 3} className="px-4 py-6 text-sm text-neutral-500 text-center">
                  No letters widened by this font. Pick a different font above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Focused preview */}
      <section className="bg-white border border-neutral-200 rounded-lg p-4">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-neutral-500">
          <span>focused preview — one row per letter at its slider level</span>
          <span className="font-mono lowercase tracking-normal text-neutral-400">
            trigger: {script.triggerLabel}
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
              <span>{stretched(L.code, rowLevels[L.name] ?? 0, script.trigger)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
