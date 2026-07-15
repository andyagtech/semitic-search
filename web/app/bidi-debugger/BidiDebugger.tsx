"use client";

import { useMemo, useState } from "react";

// --- Bidi control characters. These are format chars (Cf) that steer the
// Unicode Bidirectional Algorithm. Most are invisible, and their presence
// in a pasted string is the single most common source of "renders fine
// here, broken there" bugs. Table indexes both by codepoint and by name
// for the highlighter + tooltip.
type BidiControl = {
  cp: number;
  name: string;
  short: string; // 2-3 letter marker to show inline where the char sits
  desc: string;
};

const BIDI_CONTROLS: BidiControl[] = [
  { cp: 0x200E, name: "LEFT-TO-RIGHT MARK", short: "LRM", desc: "Zero-width, direction=L. Nudges resolution to LTR." },
  { cp: 0x200F, name: "RIGHT-TO-LEFT MARK", short: "RLM", desc: "Zero-width, direction=R. Nudges resolution to RTL." },
  { cp: 0x061C, name: "ARABIC LETTER MARK", short: "ALM", desc: "Zero-width, direction=AL. Arabic-specific RLM." },
  { cp: 0x202A, name: "LEFT-TO-RIGHT EMBEDDING", short: "LRE", desc: "Legacy: force LTR embedding. Use LRI instead." },
  { cp: 0x202B, name: "RIGHT-TO-LEFT EMBEDDING", short: "RLE", desc: "Legacy: force RTL embedding. Use RLI instead." },
  { cp: 0x202C, name: "POP DIRECTIONAL FORMATTING", short: "PDF", desc: "Closes LRE/RLE/LRO/RLO. Legacy — use PDI with isolates." },
  { cp: 0x202D, name: "LEFT-TO-RIGHT OVERRIDE", short: "LRO", desc: "Legacy: forces every char to be LTR. Dangerous — hides bidi issues." },
  { cp: 0x202E, name: "RIGHT-TO-LEFT OVERRIDE", short: "RLO", desc: "Legacy: forces every char to be RTL. Used in filename-flip attacks." },
  { cp: 0x2066, name: "LEFT-TO-RIGHT ISOLATE", short: "LRI", desc: "Modern replacement for LRE. Isolates content bidi-wise from surroundings." },
  { cp: 0x2067, name: "RIGHT-TO-LEFT ISOLATE", short: "RLI", desc: "Modern replacement for RLE." },
  { cp: 0x2068, name: "FIRST STRONG ISOLATE", short: "FSI", desc: "Direction inferred from first strong char inside. The safe default for wrapping quoted text." },
  { cp: 0x2069, name: "POP DIRECTIONAL ISOLATE", short: "PDI", desc: "Closes LRI/RLI/FSI." },
];

const BIDI_CONTROLS_BY_CP = new Map(BIDI_CONTROLS.map((c) => [c.cp, c]));

// --- Bidi class table. Not exhaustive — covers the classes any real text
// will produce (strong, weak, neutral, format). For anything not listed
// we return "ON" (Other Neutral) which matches the Unicode default for
// unassigned assignments.
function bidiClass(cp: number): { code: string; name: string } {
  // Format chars (bidi controls above)
  const ctrl = BIDI_CONTROLS_BY_CP.get(cp);
  if (ctrl) {
    if (cp === 0x200E) return { code: "L", name: "Left-to-Right" };
    if (cp === 0x200F || cp === 0x061C) return { code: "R", name: "Right-to-Left" };
    if (cp === 0x202A || cp === 0x202D || cp === 0x2066) return { code: "LRE/LRO/LRI", name: "LTR override or isolate" };
    if (cp === 0x202B || cp === 0x202E || cp === 0x2067) return { code: "RLE/RLO/RLI", name: "RTL override or isolate" };
    if (cp === 0x2068) return { code: "FSI", name: "First Strong Isolate" };
    if (cp === 0x202C || cp === 0x2069) return { code: "PDF/PDI", name: "Pop directional" };
  }
  // Hebrew (U+0590-05FF), Yiddish, Ladino
  if (cp >= 0x0590 && cp <= 0x05FF) return { code: "R", name: "Right-to-Left" };
  // Arabic (U+0600-06FF) — mostly AL (Arabic Letter), some numbers are AN/EN
  if (cp >= 0x0660 && cp <= 0x0669) return { code: "AN", name: "Arabic-Indic digit" };
  if (cp >= 0x06F0 && cp <= 0x06F9) return { code: "AN", name: "Extended Arabic-Indic digit" };
  if (cp >= 0x0600 && cp <= 0x06FF) return { code: "AL", name: "Arabic Letter" };
  // Syriac (U+0700-074F)
  if (cp >= 0x0700 && cp <= 0x074F) return { code: "AL", name: "Arabic Letter (Syriac block)" };
  // Thaana, N'Ko — also RTL
  if (cp >= 0x0780 && cp <= 0x07BF) return { code: "AL", name: "Arabic Letter (Thaana)" };
  if (cp >= 0x07C0 && cp <= 0x07FF) return { code: "R", name: "Right-to-Left (N'Ko)" };
  // Hebrew presentation forms
  if (cp >= 0xFB1D && cp <= 0xFB4F) return { code: "R", name: "Right-to-Left" };
  // Arabic presentation forms
  if (cp >= 0xFB50 && cp <= 0xFDFF) return { code: "AL", name: "Arabic Letter" };
  if (cp >= 0xFE70 && cp <= 0xFEFF) return { code: "AL", name: "Arabic Letter" };
  // ASCII digits
  if (cp >= 0x0030 && cp <= 0x0039) return { code: "EN", name: "European Number" };
  // ASCII letters
  if (cp >= 0x0041 && cp <= 0x005A) return { code: "L", name: "Left-to-Right" };
  if (cp >= 0x0061 && cp <= 0x007A) return { code: "L", name: "Left-to-Right" };
  // Latin-1 supplement + Latin extended (mostly L)
  if (cp >= 0x00C0 && cp <= 0x02AF) return { code: "L", name: "Left-to-Right" };
  // Cyrillic, Greek, Coptic, Ethiopic, most other scripts — L
  if (cp >= 0x0370 && cp <= 0x058F) return { code: "L", name: "Left-to-Right" };
  if (cp >= 0x1200 && cp <= 0x137F) return { code: "L", name: "Left-to-Right (Ethiopic)" };
  if (cp >= 0x1380 && cp <= 0x139F) return { code: "L", name: "Left-to-Right (Ethiopic Suppl.)" };
  // Space
  if (cp === 0x0020) return { code: "WS", name: "Whitespace" };
  if (cp === 0x00A0) return { code: "CS", name: "Common Separator (NBSP)" };
  // Common punctuation
  if (".,;:!?".includes(String.fromCodePoint(cp))) return { code: "ON", name: "Other Neutral" };
  if (cp >= 0x0021 && cp <= 0x0040) return { code: "ON", name: "Other Neutral (ASCII punct)" };
  // Default
  return { code: "ON", name: "Other Neutral" };
}

// Rough Script property via JS regex. \p{Script=Latin} etc. is supported
// in modern browsers.
const SCRIPT_TESTS: [string, RegExp][] = [
  ["Latin", /\p{Script=Latin}/u],
  ["Hebrew", /\p{Script=Hebrew}/u],
  ["Arabic", /\p{Script=Arabic}/u],
  ["Syriac", /\p{Script=Syriac}/u],
  ["Ethiopic", /\p{Script=Ethiopic}/u],
  ["Cyrillic", /\p{Script=Cyrillic}/u],
  ["Greek", /\p{Script=Greek}/u],
  ["Han", /\p{Script=Han}/u],
  ["Devanagari", /\p{Script=Devanagari}/u],
  ["Common", /\p{Script=Common}/u],
  ["Inherited", /\p{Script=Inherited}/u],
];

function scriptOf(ch: string): string {
  for (const [name, re] of SCRIPT_TESTS) if (re.test(ch)) return name;
  return "Unknown";
}

// General_Category via regex. Full 30-class breakdown would be noisy;
// return a friendly grouped label.
function generalCategoryOf(ch: string): string {
  if (/\p{Lu}/u.test(ch)) return "Letter, upper";
  if (/\p{Ll}/u.test(ch)) return "Letter, lower";
  if (/\p{Lt}/u.test(ch)) return "Letter, title";
  if (/\p{Lm}/u.test(ch)) return "Letter, modifier";
  if (/\p{Lo}/u.test(ch)) return "Letter, other";
  if (/\p{Mn}/u.test(ch)) return "Mark, nonspacing";
  if (/\p{Mc}/u.test(ch)) return "Mark, spacing";
  if (/\p{Me}/u.test(ch)) return "Mark, enclosing";
  if (/\p{Nd}/u.test(ch)) return "Number, decimal";
  if (/\p{Nl}/u.test(ch)) return "Number, letter";
  if (/\p{No}/u.test(ch)) return "Number, other";
  if (/\p{Pc}/u.test(ch)) return "Punct, connector";
  if (/\p{Pd}/u.test(ch)) return "Punct, dash";
  if (/\p{Ps}/u.test(ch)) return "Punct, open";
  if (/\p{Pe}/u.test(ch)) return "Punct, close";
  if (/\p{Pi}/u.test(ch)) return "Punct, initial";
  if (/\p{Pf}/u.test(ch)) return "Punct, final";
  if (/\p{Po}/u.test(ch)) return "Punct, other";
  if (/\p{Sm}/u.test(ch)) return "Symbol, math";
  if (/\p{Sc}/u.test(ch)) return "Symbol, currency";
  if (/\p{Sk}/u.test(ch)) return "Symbol, modifier";
  if (/\p{So}/u.test(ch)) return "Symbol, other";
  if (/\p{Zs}/u.test(ch)) return "Separator, space";
  if (/\p{Zl}/u.test(ch)) return "Separator, line";
  if (/\p{Zp}/u.test(ch)) return "Separator, paragraph";
  if (/\p{Cc}/u.test(ch)) return "Control";
  if (/\p{Cf}/u.test(ch)) return "Format";
  if (/\p{Cs}/u.test(ch)) return "Surrogate";
  if (/\p{Co}/u.test(ch)) return "Private Use";
  return "Unassigned";
}

const DEFAULT_INPUT =
  "Reading הַכֹּתֶל the Wall in أورشليم was ";
const DEFAULT_INPUT_2 = "unforgettable.";
// Example RTL-inside-LTR paste hazards
const HAZARD_SAMPLES: { label: string; text: string; note: string }[] = [
  {
    label: "Trilingual paragraph — Beaufort Castle",
    text:
      "On July 12, the IDF (צה״ל · جيش الدفاع الإسرائيلي) took Beaufort Castle in southern Lebanon (לבנון · لبنان).\n" +
      "The medieval crusader fortress — בופור in Hebrew, قلعة الشقيف in Arabic — sits on a ridge overlooking the Litani (نهر الليطاني) valley.\n" +
      "It last changed hands during the year-2000 withdrawal, and the recapture was reported by both Haaretz (הארץ) and Al-Jazeera (الجزيرة) within the same hour.",
    note: "Multi-line real-world scenario with 6+ RTL runs embedded in an English narrative. Notice how each parenthetical, dash, and quote hugs its neighbor's direction — hover any run in the visual-runs panel to see the direction it resolved to.",
  },
  {
    label: "Arabic word inside English sentence",
    text: "The word \"مرحبا\" means hello.",
    note: "Bidi-safe when isolated. Try adding \"!\" at the end and watch it swap sides.",
  },
  {
    label: "English quote inside Arabic sentence",
    text: "قالت المعلمة \"Hello, world!\" ثم غادرت.",
    note: "The English quote is L inside an AL context — its punctuation flips visually.",
  },
  {
    label: "Filename attack (RLO)",
    text: "invoice‮gnp.exe",
    note: "RLO makes 'invoice.png' out of an .exe. Classic phishing trick.",
  },
  {
    label: "Hebrew comment in code (long)",
    text:
      "function checkWalkieTalkies(city) {\n" +
      "  // הפונקציה הזו בודקת את מצב מכשירי הקשר בביירות\n" +
      "  return devices.filter(d => d.status === \"online\");\n" +
      "}",
    note: "The comment SHOULD sit visually after the // on its own line. But because ‏// and space are neutrals and Hebrew is R, the // + trailing spaces get pulled into the RTL run, so the comment reads out of order and cursor arrows jump. Wrap the Hebrew in FSI…PDI (or <bdi>) to lock it. Tutorial case #6.",
  },
  {
    label: "Arabic comment in code (long)",
    text:
      "function captureLog(event) {\n" +
      "  // هذه الدالة تسجل الأحداث الأخيرة في جنوب لبنان\n" +
      "  return db.insert(\"events\", event);\n" +
      "}",
    note: "Same failure mode as the Hebrew version. The // marker gets absorbed into the AL run; the closing brace of the block appears in the wrong place if you don't isolate the comment.",
  },
  {
    label: "Mixed digits (EN vs AN)",
    text: "السنة ٢٠٢٥ / 2025",
    note: "European vs Arabic-Indic digits resolve to different bidi classes.",
  },
];

// Split a codepoint sequence into a run structure keyed by resolved
// direction. This is not the full UAX #9 algorithm — we assign each char
// its base bidi class and then coalesce adjacent chars of the same
// direction into visual runs, treating spaces/punctuation as neutrals
// that inherit their neighbors' direction (approximation).
type Run = { dir: "ltr" | "rtl" | "neutral"; chars: number[]; start: number };
function buildRuns(text: string): Run[] {
  const chars = [...text];
  const runs: Run[] = [];
  let i = 0;
  for (const ch of chars) {
    const cp = ch.codePointAt(0)!;
    const cls = bidiClass(cp).code;
    let dir: Run["dir"] = "neutral";
    if (cls === "L") dir = "ltr";
    else if (cls === "R" || cls === "AL") dir = "rtl";
    else if (cls.startsWith("LRE") || cls.startsWith("RLE") || cls === "FSI" || cls.startsWith("PDF")) dir = "neutral";
    const last = runs[runs.length - 1];
    if (last && last.dir === dir) last.chars.push(cp);
    else runs.push({ dir, chars: [cp], start: i });
    i += ch.length;
  }
  return runs;
}

// Wrap the string with First-Strong Isolates: split on hard direction
// transitions, wrap each RTL/LTR segment in FSI...PDI. Result: string
// renders identically regardless of the outer paragraph direction.
function wrapForSafePaste(text: string): string {
  const FSI = "⁨";
  const PDI = "⁩";
  const chars = [...text];
  const parts: string[] = [];
  let buf = "";
  let bufDir: "ltr" | "rtl" | "neutral" = "neutral";
  const flush = () => {
    if (!buf) return;
    if (bufDir === "neutral") parts.push(buf);
    else parts.push(FSI + buf + PDI);
    buf = "";
    bufDir = "neutral";
  };
  for (const ch of chars) {
    const cp = ch.codePointAt(0)!;
    const cls = bidiClass(cp).code;
    let dir: "ltr" | "rtl" | "neutral" = "neutral";
    if (cls === "L") dir = "ltr";
    else if (cls === "R" || cls === "AL") dir = "rtl";
    if (dir === "neutral") { buf += ch; continue; }
    if (bufDir === "neutral") { bufDir = dir; buf += ch; continue; }
    if (dir === bufDir) { buf += ch; continue; }
    flush();
    buf = ch;
    bufDir = dir;
  }
  flush();
  return parts.join("");
}

function codePointHex(cp: number): string {
  return "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
}

function displayGlyph(cp: number): string {
  const ctrl = BIDI_CONTROLS_BY_CP.get(cp);
  if (ctrl) return ctrl.short;
  if (cp === 0x0020) return "␣";
  if (cp === 0x0009) return "→";
  if (cp === 0x000A) return "↵";
  if (cp === 0x00A0) return "␣ (NBSP)";
  const ch = String.fromCodePoint(cp);
  // Combining marks — attach to dotted circle
  if (/\p{Mn}|\p{Me}/u.test(ch)) return "◌" + ch;
  return ch;
}

export function BidiDebugger() {
  const [text, setText] = useState(DEFAULT_INPUT + DEFAULT_INPUT_2);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [renderDir, setRenderDir] = useState<"auto" | "ltr" | "rtl">("auto");

  const chars = useMemo(() => [...text].map((ch, i) => ({
    ch,
    cp: ch.codePointAt(0)!,
    logicalIdx: i,
  })), [text]);

  const runs = useMemo(() => buildRuns(text), [text]);

  const controlCount = useMemo(
    () => chars.filter((c) => BIDI_CONTROLS_BY_CP.has(c.cp)).length,
    [chars]
  );

  const selected = selectedIdx !== null && chars[selectedIdx] ? chars[selectedIdx] : null;

  return (
    <div className="space-y-6">
      {/* Input */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Text to analyze
          <span className="text-xs text-neutral-500 font-normal ml-2">
            paste anything — English + Arabic, code with RTL comments, suspicious file names
          </span>
        </label>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setSelectedIdx(null); }}
          className="w-full min-h-[80px] px-3 py-2 rounded border border-neutral-300 font-mono text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-sky-400"
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-neutral-600">
          <span className="font-medium">Try:</span>
          {HAZARD_SAMPLES.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => { setText(s.text); setSelectedIdx(null); }}
              className="px-2 py-1 rounded border border-neutral-300 hover:border-neutral-500 hover:bg-neutral-50"
              title={s.note}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Visual render */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <header className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-neutral-800">Visual render</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-500">paragraph dir:</span>
            {(["auto", "ltr", "rtl"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRenderDir(d)}
                className={
                  "px-2 py-0.5 rounded border " +
                  (renderDir === d
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "border-neutral-300 hover:border-neutral-500")
                }
              >
                {d}
              </button>
            ))}
          </div>
        </header>
        <div
          dir={renderDir}
          className="text-2xl leading-relaxed p-3 rounded bg-neutral-50 border border-neutral-200 whitespace-pre-wrap break-words min-h-[60px]"
        >
          {text || <span className="text-neutral-400 text-sm">(empty)</span>}
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          This is exactly how the browser would render the raw string in a
          {" "}<code className="bg-neutral-100 px-1 rounded">dir=&quot;{renderDir}&quot;</code>
          {" "}context. Switch the paragraph dir to see how the same memory-order string flips.
        </p>
      </section>

      {/* Visual runs + wrap button */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <header className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-neutral-800">Bidi runs</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const wrapped = wrapForSafePaste(text);
                navigator.clipboard?.writeText(wrapped);
                setText(wrapped);
              }}
              className="text-xs px-3 py-1.5 rounded border border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-medium"
              title="Wrap each direction segment in FSI…PDI (U+2068…U+2069) so the string renders the same in any bidi context. Result is copied to clipboard AND replaces the current text."
            >
              Wrap for safe paste →
            </button>
          </div>
        </header>
        <div className="text-xs text-neutral-600 mb-2">
          Approximation of UAX #9: consecutive strong-typed characters
          coalesce into runs. Neutrals inherit their neighbors&apos; direction
          in the browser but stay {" "}
          <span className="px-1 rounded bg-neutral-200">gray</span> here so
          you can see where a paste boundary might swap them.
        </div>
        <div className="flex flex-wrap gap-1 p-3 rounded bg-neutral-50 border border-neutral-200 min-h-[60px]">
          {runs.map((run, i) => (
            <span
              key={i}
              className={
                "px-2 py-1 rounded text-lg whitespace-pre " +
                (run.dir === "ltr"
                  ? "bg-sky-100 text-sky-900"
                  : run.dir === "rtl"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-neutral-200 text-neutral-700")
              }
              dir={run.dir === "rtl" ? "rtl" : "ltr"}
              title={`run ${i}: ${run.dir.toUpperCase()} — starts at char ${run.start}`}
            >
              {run.chars.map((cp) => String.fromCodePoint(cp)).join("")}
            </span>
          ))}
        </div>
      </section>

      {/* Logical order */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <header className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-neutral-800">
            Logical order (memory order)
          </h2>
          <div className="text-xs text-neutral-600">
            {chars.length} chars
            {controlCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                {controlCount} invisible bidi control{controlCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </header>
        <div className="overflow-x-auto">
          <div className="flex flex-wrap gap-1">
            {chars.map((c, i) => {
              const isControl = BIDI_CONTROLS_BY_CP.has(c.cp);
              const isSelected = selectedIdx === i;
              const cls = bidiClass(c.cp).code;
              const dirColor =
                cls === "L" ? "border-sky-300 bg-sky-50" :
                cls === "R" || cls === "AL" ? "border-amber-300 bg-amber-50" :
                cls === "EN" || cls === "AN" ? "border-emerald-300 bg-emerald-50" :
                "border-neutral-300 bg-neutral-50";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedIdx(i === selectedIdx ? null : i)}
                  className={
                    "min-w-[44px] px-2 py-1.5 rounded border text-center transition " +
                    (isControl
                      ? "border-fuchsia-400 bg-fuchsia-50 text-fuchsia-900 ring-1 ring-fuchsia-200 "
                      : dirColor + " text-neutral-800 ") +
                    (isSelected ? " ring-2 ring-neutral-900" : " hover:border-neutral-500")
                  }
                  title={
                    isControl
                      ? `${BIDI_CONTROLS_BY_CP.get(c.cp)!.name}\n${BIDI_CONTROLS_BY_CP.get(c.cp)!.desc}`
                      : `${codePointHex(c.cp)} — bidi: ${cls}`
                  }
                >
                  <div className="text-base leading-tight" dir="ltr">
                    {displayGlyph(c.cp)}
                  </div>
                  <div className="text-[9px] text-neutral-500 mt-0.5 font-mono">
                    {codePointHex(c.cp)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selected && (
          <div className="mt-4 p-3 rounded border border-neutral-300 bg-neutral-50 text-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-2xl font-mono px-3 py-1 rounded border border-neutral-300 bg-white min-w-[52px] text-center">
                {displayGlyph(selected.cp)}
              </div>
              <div>
                <div className="font-mono text-xs text-neutral-500">
                  {codePointHex(selected.cp)}
                  {" · logical index "}{selected.logicalIdx}
                </div>
                <div className="text-neutral-800 font-medium">
                  {BIDI_CONTROLS_BY_CP.get(selected.cp)?.name ??
                    "(name lookup not shipped — see JS RegExp Unicode props for category/script)"}
                </div>
              </div>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
              <div>
                <dt className="text-neutral-500">Bidi class</dt>
                <dd className="font-mono text-neutral-900">{bidiClass(selected.cp).code}</dd>
                <dd className="text-neutral-600">{bidiClass(selected.cp).name}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Script</dt>
                <dd className="font-mono text-neutral-900">{scriptOf(String.fromCodePoint(selected.cp))}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">General Category</dt>
                <dd className="font-mono text-neutral-900">{generalCategoryOf(String.fromCodePoint(selected.cp))}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Default ignorable?</dt>
                <dd className="font-mono text-neutral-900">
                  {/\p{Default_Ignorable_Code_Point}/u.test(String.fromCodePoint(selected.cp)) ? "yes" : "no"}
                </dd>
              </div>
            </dl>
            {BIDI_CONTROLS_BY_CP.get(selected.cp) && (
              <div className="mt-2 text-xs text-fuchsia-900 bg-fuchsia-50 border border-fuchsia-200 rounded p-2">
                <span className="font-medium">Bidi control:</span>{" "}
                {BIDI_CONTROLS_BY_CP.get(selected.cp)!.desc}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Insert controls */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-800 mb-2">
          Insert a bidi control
        </h2>
        <p className="text-xs text-neutral-600 mb-3">
          Append the chosen control character to the end of the text (or wrap
          the selection if you&apos;ve selected a character). All are invisible
          — check the logical-order panel above to see them.
        </p>
        <div className="flex flex-wrap gap-1">
          {BIDI_CONTROLS.map((c) => (
            <button
              key={c.cp}
              type="button"
              onClick={() => { setText(text + String.fromCodePoint(c.cp)); }}
              className="px-2 py-1 rounded border border-neutral-300 hover:border-fuchsia-500 hover:bg-fuchsia-50 text-xs font-mono"
              title={`${c.name}\n${c.desc}\n${codePointHex(c.cp)}`}
            >
              +{c.short}
            </button>
          ))}
        </div>
      </section>

      <BidiTutorial onLoad={setText} />
    </div>
  );
}

// --- Tutorial. A progression of increasingly gnarly bidi cases, each
// with its own explanation. Collapsible top-level and per-case.
type TutorialCase = {
  title: string;
  text: string;
  paragraphDir?: "ltr" | "rtl" | "auto";
  explain: React.ReactNode;
};

const TUTORIAL_CASES: TutorialCase[] = [
  {
    title: "1. Pure LTR — the boring baseline",
    text: "The quick brown fox jumps over the lazy dog.",
    explain: (
      <>
        Every character is <code>Bidi_Class=L</code>. Nothing to resolve;
        memory order and visual order match. Cursor moves left-to-right.
        Useful only as a sanity anchor before adding complexity.
      </>
    ),
  },
  {
    title: "2. Pure RTL — Hebrew or Arabic on its own",
    text: "שלום עולם",
    paragraphDir: "rtl",
    explain: (
      <>
        Every character is <code>R</code> (Hebrew) or <code>AL</code> (Arabic).
        The browser reverses visual order so the first-typed character sits at
        the right edge. Cursor moves right-to-left. Still simple — one script,
        one direction, no ambiguity.
      </>
    ),
  },
  {
    title: "3. First mix — one RTL word inside an LTR paragraph",
    text: "The word مرحبا means hello.",
    explain: (
      <>
        Bidi has to decide where the boundary between the English and Arabic
        runs falls. The <em>strong-typed</em> chars carry their own direction
        (L for English letters, AL for Arabic). The spaces around{" "}
        <code>مرحبا</code> are neutrals (<code>WS</code>) that inherit from
        their strong neighbors. Result: Arabic renders as a discrete RTL
        island, everything else stays LTR. Reads correctly by luck — the
        neighbors happen to give the neutrals unambiguous direction.
      </>
    ),
  },
  {
    title: "4. Why quotes seem to work — neutrals absorbed both sides",
    text: 'The word "مرحبا" means hello.',
    explain: (
      <>
        You&apos;ll notice quoting an inserted word almost always <em>looks</em>{" "}
        right. The reason is subtle and NOT what people think. Quotes are{" "}
        <code>ON</code> (Other Neutral) — they don&apos;t have direction of
        their own. Because both quotes sit between the surrounding English
        (L) and the Arabic (AL), each quote gets a strong neighbor on one
        side and a neutral (space) on the other. UAX #9 resolves them toward
        the paragraph direction (LTR here), so they render{" "}
        <code>&quot;مرحبا&quot;</code> in visual order — the quotes stay on
        the &quot;outside&quot; of the Arabic word. This is <em>resolution
        by neighborhood</em>, not real isolation. It happens to look right
        for one word in a simple sentence, and that&apos;s why the trick is
        so common. It fails as soon as complexity grows (see below).
      </>
    ),
  },
  {
    title: "5. Where quotes fail — RTL run absorbs trailing punctuation",
    text: 'The word "مرحبا"! surprised me.',
    explain: (
      <>
        Add a <code>!</code> right after the closing quote. That{" "}
        <code>!</code> is a neutral. The strong-typed char to its <em>left
        </em> is Arabic (AL). Bidi resolves the <code>!</code> against its
        strongest neighbor, which is the Arabic — so <code>!</code> and the
        closing <code>&quot;</code> get pulled visually INTO the RTL run,
        ending up <em>before</em> the word in reading order. The line reads
        as though someone wrote{" "}
        <code>&quot;!&quot; مرحبا surprised me</code>. Not what the author
        typed. Neutrals-follow-neighbors is fragile.
      </>
    ),
  },
  {
    title: "6. The real fix — Unicode isolates (FSI…PDI)",
    text: "The word ⁨\"مرحبا\"!⁩ surprised me.",
    explain: (
      <>
        Wrap the inserted phrase in <code>FSI</code> (U+2068, First Strong
        Isolate) and <code>PDI</code> (U+2069, Pop Directional Isolate).
        Same text, same characters, but now the run{" "}
        <code>&quot;مرحبا&quot;!</code> is a <em>sealed</em> bidi context —
        UAX #9 resolves it in isolation, and the surrounding English can&apos;t
        pull its punctuation in. The isolates are invisible, so you don&apos;t
        see them, but they do all the work. This is what the &quot;Wrap for
        safe paste&quot; button up top produces.
        {" "}<b>Bonus:</b> the position of the <code>!</code> inside the
        quotes is now controlled by MEMORY ORDER, not by resolution
        heuristics. Type <code>&quot;!مرحبا&quot;</code> (bang FIRST) →
        the bang appears visually to the LEFT of the Arabic word; type{" "}
        <code>&quot;مرحبا!&quot;</code> (bang LAST) → the bang appears
        visually to the RIGHT. Both are valid, both are stable, choose by
        semantics. The isolate just guarantees your choice sticks.
      </>
    ),
  },
  {
    title: "6b. Choosing bang position — same content, two intents",
    text:
      "Bang before the word:  ⁨\"!مرحبا\"⁩ surprised me.\n" +
      "Bang after the word:   ⁨\"مرحبا!\"⁩ surprised me.",
    explain: (
      <>
        Two isolated variants. Both have exactly the same characters
        (opening quote, bang, Arabic, closing quote) — but the bang
        appears in a different <em>memory</em> position. Because the
        content is isolated, memory order fully determines visual
        position and the surrounding English can&apos;t interfere.
        Rule of thumb: <b>type the punctuation where you want it
        RELATIVE TO THE ARABIC WORD, in reading order.</b> In the top
        line, bang comes before the word in memory → visually to the
        LEFT of the Arabic. In the bottom, bang comes after → visually
        to the RIGHT. This is the whole reason isolates matter: they
        make position deterministic.
      </>
    ),
  },
  {
    title: "7. Same fix in HTML — the <bdi> element",
    text: 'The word <bdi>"مرحبا"!</bdi> surprised me.',
    explain: (
      <>
        In web content you can wrap the phrase in{" "}
        <code>&lt;bdi&gt;…&lt;/bdi&gt;</code> instead of adding invisible
        Unicode chars. The <code>&lt;bdi&gt;</code> element (Bi-Directional
        Isolate) is spec-defined to apply <code>unicode-bidi: isolate</code>{" "}
        and <code>direction: auto</code>. Same result as FSI…PDI, cleaner
        in source, and grep-friendly. If you don&apos;t control the markup,
        the Unicode isolates are the fallback. The sample text here shows
        the HTML — the visual render will render it as literal tags, not
        interpret them.
      </>
    ),
  },
  {
    title: "8. CSS-only variant — unicode-bidi: isolate on any span",
    text: "For arbitrary elements: <span dir=\"auto\" style=\"unicode-bidi:isolate\">مرحبا</span> works too.",
    explain: (
      <>
        If you can&apos;t use <code>&lt;bdi&gt;</code> (some old CMS, custom
        component), any element with{" "}
        <code>unicode-bidi: isolate; direction: auto</code> gives you the
        same behavior. <code>bidi-override</code> is the stronger sibling —
        it forces every character to a single direction regardless of its
        own class, useful for filename-safe display, but breaks natural
        Arabic/Hebrew reading order.
      </>
    ),
  },
  {
    title: "9. The RLO attack — same primitives, weaponized",
    text: "invoice‮gnp.exe",
    explain: (
      <>
        <code>U+202E</code> is <code>RLO</code> (Right-to-Left Override) —
        it forces every following character to be RTL until a{" "}
        <code>PDF</code>. Attackers put it inside filenames so{" "}
        <code>invoice&lt;RLO&gt;gnp.exe</code> displays as{" "}
        <code>invoice.exe.png</code>-looking text, tricking users into
        double-clicking an executable. Modern OSes and mail clients now
        strip or warn on stray overrides for this reason. Load this example
        and look at the Bidi runs panel — the <code>RLO</code> shows up
        highlighted in fuchsia in the logical-order grid.
      </>
    ),
  },
  {
    title: "10. Numbers, the sneakiest neutrals",
    text: "العام ٢٠٢٥ / 2025",
    paragraphDir: "rtl",
    explain: (
      <>
        Digits have their own bidi classes: European (<code>0-9</code>) →{" "}
        <code>EN</code>, Arabic-Indic (<code>٠-٩</code>) → <code>AN</code>.
        These are <em>weak</em> — they render left-to-right internally, but
        their surroundings pull them around. In an Arabic paragraph, the
        Latin digits <code>2025</code> stay LTR internally but appear on the
        &quot;wrong&quot; side of the slash. Mixing digit systems in a
        currency amount is the classic real-world case where copy-paste
        breaks silently.
      </>
    ),
  },
];

function BidiTutorial({ onLoad }: { onLoad: (text: string) => void }) {
  return (
    <details className="rounded-lg border border-neutral-200 bg-white p-4 group">
      <summary className="cursor-pointer text-sm font-semibold text-neutral-800 list-none flex items-center gap-2">
        <span className="text-neutral-400 group-open:rotate-90 transition-transform">▶</span>
        BiDi tutorial — from pure LTR to why quotes fail
        <span className="text-xs text-neutral-500 font-normal ml-2">
          overview · orders of text · 10 progressively gnarlier cases · click any to load into the tool
        </span>
      </summary>
      <div className="mt-4 space-y-3">

        {/* Overview */}
        <details className="border border-neutral-200 rounded p-3 bg-neutral-50" open>
          <summary className="cursor-pointer text-sm font-semibold text-neutral-800 list-none flex items-center gap-2">
            <span className="text-neutral-400">▸</span> What BiDi is, and why it&apos;s needed
          </summary>
          <div className="mt-3 text-xs text-neutral-700 leading-relaxed space-y-2">
            <p>
              &quot;BiDi&quot; is short for <b>bidirectional text</b> — text
              that mixes scripts written in different directions. Latin,
              Cyrillic, Greek, Han, Devanagari all read <b>left-to-right</b>{" "}
              (LTR). Hebrew, Arabic, Syriac, Aramaic, Thaana, Nʼko all read
              <b> right-to-left</b> (RTL). Ancient scripts like paleo-Hebrew
              and Old South Arabian are RTL too. When these mix — an Arabic
              quotation in an English paper, a Hebrew comment in a
              JavaScript file, an English brand name in a Persian tweet —
              the browser has to decide, character by character, which
              direction each glyph reads and where the cursor should sit.
            </p>
            <p>
              A quick vocabulary note before we go further: programmers
              call any run of text characters a <b>string</b> — the
              letters, digits, spaces, and punctuation that make up a
              word, a sentence, or a whole paragraph, stored side by
              side in memory. Everything you type into the box above is
              a string. Everything on this page is strings. When we say
              &quot;the algorithm runs over a string&quot; below, that
              just means it reads the characters left-to-right (in
              memory) and decides what to do with each one.
            </p>
            <p>
              The rules live in <b>Unicode Annex #9: The Bidirectional
              Algorithm</b> (UAX #9). It runs over every string that mixes
              directions and produces a <b>resolved level</b> for each
              character (an even integer = LTR, odd = RTL). Then the
              renderer walks the string in <em>visual</em>{" "}order using
              those levels. The algorithm is deterministic, spec&apos;d
              since Unicode 3.0 (1999), and implemented consistently in
              every browser, terminal, OS, and Word processor.
            </p>
            <p>
              <b>The reason it&apos;s hard</b>: Unicode strings are stored
              in <em>logical</em>{" "}order (the order you&apos;d dictate the
              letters), but they render in <em>visual</em>{" "}order (what you
              see on screen). For pure LTR or pure RTL text these are
              trivially related — one is the reverse of the other. For
              mixed text they diverge in ways that are locally correct
              but globally surprising: a comma you typed at the end of an
              Arabic word can appear at the visual beginning of it; a
              closing quote can migrate two words to the left; a cursor
              arrow-key that feels &quot;right&quot; can move you further
              from where you meant to edit.
            </p>
            <p>
              The tool above shows you the algorithm&apos;s decisions
              step-by-step for any string. The tutorial below shows the
              common failure modes, in escalating order.
            </p>
          </div>
        </details>

        {/* Orders of text */}
        <details className="border border-neutral-200 rounded p-3 bg-neutral-50">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-800 list-none flex items-center gap-2">
            <span className="text-neutral-400">▸</span> Three orders of text: typing, logical, visual
          </summary>
          <div className="mt-3 text-xs text-neutral-700 leading-relaxed space-y-2">
            <p>
              People often ask &quot;is typing order the same as logical
              order?&quot; The short answer:{" "}
              <b>typing order = logical order</b> in modern text-input
              systems. Visual order is the one that differs from both.
              Three definitions, then the edge cases where the equality
              breaks.
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
              <div className="p-2 rounded bg-white border border-neutral-200">
                <dt className="font-semibold text-neutral-800">Typing order</dt>
                <dd className="text-neutral-700 mt-1">
                  The sequence of keys you press. Each keystroke appends
                  its character to the buffer at the current cursor
                  position.
                </dd>
              </div>
              <div className="p-2 rounded bg-white border border-neutral-200">
                <dt className="font-semibold text-neutral-800">Logical order (memory order)</dt>
                <dd className="text-neutral-700 mt-1">
                  How the string is stored in memory / on disk / in the
                  DOM — a linear sequence of Unicode code points,
                  ordered as they were appended.
                </dd>
              </div>
              <div className="p-2 rounded bg-white border border-neutral-200">
                <dt className="font-semibold text-neutral-800">Visual order (reading order)</dt>
                <dd className="text-neutral-700 mt-1">
                  How pixels land on screen after UAX #9 runs. LTR runs
                  stay in memory order; RTL runs are reversed; mixed
                  text is chunked and each chunk reversed
                  independently.
                </dd>
              </div>
            </dl>
            <p>
              Take &quot;<span className="font-serif">שלום</span>&quot;. You
              press the four keys <code>ש · ל · ו · ם</code> in that order.
              Memory holds <code>[ש, ל, ו, ם]</code> — same order. The
              renderer walks it in visual order and paints
              <code> ם ו ל ש</code>, i.e. right-to-left on the page. Typing
              order and logical order are identical; visual order is the
              reverse.
            </p>
            <p>
              For LTR text (English, code) all three collapse to the same
              order — which is why LTR-native developers spend years not
              noticing the distinction exists.
            </p>
            <p className="pt-1"><b>Where the equality between typing and logical DOES break down</b> — a handful of edge cases:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <b>Vietnamese-style IME composition.</b> You may press
                <code> e</code> then a tone key then a hat key; some IMEs
                store <code>U+1EBF</code> (precomposed), others store{" "}
                <code>e + ̂ + ́</code> (decomposed). Typing sequence ≠
                stored sequence.
              </li>
              <li>
                <b>Unicode normalization on save.</b> Editors that apply
                NFC or NFD reorder combining marks into canonical order.
                Typed <code>e + ́ + ̂</code> may end up stored as{" "}
                <code>e + ̂ + ́</code> (or as <code>ế</code> entirely).
              </li>
              <li>
                <b>Old &quot;visual-order&quot; Hebrew.</b> Pre-Unicode
                Hebrew systems (VT100 terminals, some DOS files) stored
                text in <em>visual</em> order — you typed
                right-to-left BUT saved letters in the order they appeared
                on screen. Modern Unicode uses logical order universally,
                but you occasionally encounter legacy visual-order files
                that render as gibberish until re-reversed.
              </li>
              <li>
                <b>Autocomplete and paste.</b> These insert whole strings
                at once — no per-keystroke typing sequence exists.
                &quot;Typing order&quot; is undefined here; only logical
                order is meaningful.
              </li>
            </ul>
            <p className="pt-1">
              <b>Practical consequence: cursor keys move by LOGICAL order,
              not visual.</b> Press right-arrow in a Hebrew word and the
              cursor moves to the next logical character — which sits
              visually to the LEFT. This is spec-defined and consistent,
              but it feels backwards to LTR-native users. macOS and
              Windows both offer an &quot;RTL cursor keys&quot; option
              that swaps left/right in RTL contexts; enable it if the
              logical behavior bothers you.
            </p>
          </div>
        </details>

        {/* When + where to add controls */}
        <details className="border border-neutral-200 rounded p-3 bg-neutral-50">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-800 list-none flex items-center gap-2">
            <span className="text-neutral-400">▸</span> When and where to add BiDi controls
          </summary>
          <div className="mt-3 text-xs text-neutral-700 leading-relaxed space-y-3">
            <p>
              Most bidi bugs come from either <b>doing nothing when you
              should isolate</b> (the failure modes in cases 4-5, 9) or{" "}
              <b>reaching for legacy overrides when isolates would do</b>{" "}
              (the RLO attack in case 9 is possible because LRO/RLO/PDF
              even exist). Here is the concrete decision tree.
            </p>

            <div className="space-y-2">
              <p className="font-semibold text-neutral-800">Add an isolate WHEN:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <b>You&apos;re displaying user-supplied text</b> whose
                  direction you don&apos;t control — usernames, comments,
                  product titles, chat messages, email subjects. Every one
                  of these gets wrapped, always, no exceptions. This is
                  the single biggest ROI move.
                </li>
                <li>
                  <b>You&apos;re embedding a proper noun or quoted phrase
                  in the opposite direction</b> — an Arabic name in an
                  English paragraph, an English brand in a Persian tweet.
                  Wrap the embedded chunk even if quotes seem to work
                  today (case #5 shows how one added punctuation mark
                  breaks it).
                </li>
                <li>
                  <b>Two adjacent runs of different directions could bleed
                  neutral punctuation into each other</b> — parentheticals,
                  colons, dashes, ellipses. Any neutral character between
                  strong-typed chars of different directions is a bidi
                  bug waiting to happen.
                </li>
                <li>
                  <b>Content moves across systems</b> (paste-to-email,
                  export-to-PDF, database-to-page). The receiver&apos;s
                  paragraph direction may differ from yours; isolates make
                  the run render identically regardless.
                </li>
                <li>
                  <b>You render RTL content inside a fixed-LTR UI</b>{" "}
                  (Slack in English locale, most corporate wikis, code
                  editors). The UI direction anchors resolution;
                  everything RTL you display should be isolated.
                </li>
                <li>
                  <b>Filenames, URLs, identifiers, code strings</b> — any
                  place where a wrong-side punctuation change means the
                  wrong thing gets clicked, run, or referenced.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-neutral-800">SKIP the isolate when:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <b>The text is entirely one direction.</b> Pure English,
                  pure Arabic, pure Hebrew — no isolation needed, wrapping
                  adds no-op invisible characters and clutter to your
                  markup.
                </li>
                <li>
                  <b>You are the author and you&apos;ve verified the render
                  in the actual target contexts.</b> If it looks correct
                  in email, chat, printout, and screen reader, don&apos;t
                  add controls prophylactically. But re-check after any
                  edit — case #5 is a one-character-away failure.
                </li>
                <li>
                  <b>Inside a code compiler / interpreter.</b> Parsers
                  read logical order, so <code>&quot;שלום&quot;</code> is
                  the same string whether isolated or not — the compiler
                  doesn&apos;t care. But your COMMENTS and STRING
                  LITERALS displayed to humans still do.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-neutral-800">
                WHERE to add the isolate — three surfaces, same effect:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2 rounded bg-white border border-neutral-200">
                  <div className="font-semibold text-neutral-800 mb-1">
                    HTML (preferred)
                  </div>
                  <div className="font-mono text-[11px] bg-neutral-100 p-1.5 rounded whitespace-pre-wrap break-all">
                    &lt;bdi&gt;{`{userName}`}&lt;/bdi&gt;
                  </div>
                  <div className="mt-1 text-neutral-600">
                    Semantic, grep-friendly, screen-reader-aware. Use for
                    everything you can.
                  </div>
                </div>
                <div className="p-2 rounded bg-white border border-neutral-200">
                  <div className="font-semibold text-neutral-800 mb-1">
                    CSS (custom components)
                  </div>
                  <div className="font-mono text-[11px] bg-neutral-100 p-1.5 rounded whitespace-pre-wrap break-all">
                    &lt;span dir=&quot;auto&quot;
                    {"\n"}style=&quot;unicode-bidi:isolate&quot;&gt;
                    {"\n"}{`{userName}`}
                    {"\n"}&lt;/span&gt;
                  </div>
                  <div className="mt-1 text-neutral-600">
                    When you can&apos;t use <code>&lt;bdi&gt;</code> (old
                    CMS, design-system spans).
                  </div>
                </div>
                <div className="p-2 rounded bg-white border border-neutral-200">
                  <div className="font-semibold text-neutral-800 mb-1">
                    Plain text / Unicode
                  </div>
                  <div className="font-mono text-[11px] bg-neutral-100 p-1.5 rounded whitespace-pre-wrap break-all">
                    &quot;⁨&quot; + userName{"\n"}+ &quot;⁩&quot;
                  </div>
                  <div className="mt-1 text-neutral-600">
                    FSI + text + PDI. Use in emails, chat, log files,
                    push notifications, anywhere without markup.
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-neutral-800">
                Which isolate character? A quick chooser:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <b>FSI (U+2068) → default choice.</b> The isolate infers
                  direction from the first strong-typed character inside.
                  Right for 95% of cases including all &quot;wrap this
                  user-supplied thing&quot; scenarios.
                </li>
                <li>
                  <b>LRI (U+2066)</b> when you know for certain the
                  content is LTR (an English brand name).{" "}
                  <b>RLI (U+2067)</b> when you know it&apos;s RTL. Use
                  these only if the FSI first-strong heuristic guesses
                  wrong for your content.
                </li>
                <li>
                  <b>PDI (U+2069) always closes.</b> One PDI per opening
                  isolate, in matching nesting. Unclosed isolates cascade
                  until the paragraph ends.
                </li>
                <li>
                  <b>LRE / RLE / LRO / RLO / PDF are legacy.</b> Don&apos;t
                  add them to new content. They stay in Unicode for
                  backward compat, but isolates supersede them and{" "}
                  <em>never</em> have the RLO-attack failure mode.
                </li>
              </ul>
            </div>

            <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
              <p className="font-semibold text-emerald-900 mb-1">
                Copy-paste rule for React / Vue / Svelte:
              </p>
              <p className="text-emerald-900">
                Anywhere you render user text — <code>{`{userName}`}</code>,{" "}
                <code>{`{comment.body}`}</code>,{" "}
                <code>{`{article.title}`}</code> — wrap it:
              </p>
              <pre className="mt-2 font-mono text-[11px] bg-white p-2 rounded border border-emerald-200 overflow-x-auto">{`<bdi>{userName}</bdi>`}</pre>
              <p className="mt-2 text-emerald-900">
                That single change eliminates ~90% of user-facing bidi
                bugs in the average app. The other 10% are cases like the
                code comments above, where you need to hand-wrap around
                whole segments you authored yourself.
              </p>
            </div>
          </div>
        </details>

        {/* Fixing the three canonical failures */}
        <details className="border border-neutral-200 rounded p-3 bg-neutral-50">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-800 list-none flex items-center gap-2">
            <span className="text-neutral-400">▸</span> Fixing the three canonical failures
          </summary>
          <div className="mt-3 text-xs text-neutral-700 leading-relaxed space-y-3">
            <p>
              The overview mentioned three specific breakage patterns.
              Each has a concrete fix. Copy any pair into the analyzer
              above and switch paragraph direction to see the difference.
            </p>

            <div className="p-2 rounded bg-white border border-neutral-200 space-y-2">
              <p className="font-semibold text-neutral-800">
                Failure #1: A comma typed at the end of an Arabic word
                appears at the visual beginning of it.
              </p>
              <p>
                Memory: <code>The word مرحبا, was surprising.</code> —
                you typed the comma after the Arabic. In an LTR paragraph
                the comma is a neutral flanked by AL on the left and
                <code>&nbsp;was</code> (L) on the right. UAX #9 rule N1
                resolves it toward the strongest adjacent (AL wins because
                &quot;was&quot; is separated by a space). The comma joins
                the RTL run and appears visually LEFT of the Arabic
                letters — same paragraph reads as
                <code> The word ,مرحبا was surprising</code>.
              </p>
              <p className="text-neutral-800 font-medium">Fix:</p>
              <pre className="font-mono text-[11px] bg-neutral-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">{'The word ⁨مرحبا⁩, was surprising.'}</pre>
              <p>
                FSI…PDI seals the Arabic. Now the comma sits outside the
                isolate, in the LTR paragraph run, and resolves as LTR —
                staying visually AFTER the Arabic word. In HTML:{" "}
                <code>{`The word <bdi>مرحبا</bdi>, was surprising.`}</code>
              </p>
            </div>

            <div className="p-2 rounded bg-white border border-neutral-200 space-y-2">
              <p className="font-semibold text-neutral-800">
                Failure #2: A closing quote migrates two words to the left.
              </p>
              <p>
                Memory:{" "}
                <code>He said &quot;مرحبا يا صديقي&quot; and waved.</code>
                {" "}— quoted Arabic phrase inside an English sentence. The
                closing <code>&quot;</code> is a neutral. Its neighbors
                are Arabic on the left, space then <code>and</code> (L) on
                the right. AL wins; quote absorbs into the RTL run and
                slides across it visually until it exits the RTL region —
                landing on the far LEFT of the phrase, next to the opening
                quote. Reads as{" "}
                <code>He said &quot;&quot;مرحبا يا صديقي and waved</code>
                {" "}— both quotes on the same side.
              </p>
              <p className="text-neutral-800 font-medium">Fix:</p>
              <pre className="font-mono text-[11px] bg-neutral-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">{'He said ⁨"مرحبا يا صديقي"⁩ and waved.'}</pre>
              <p>
                Wrap the ENTIRE quoted phrase — including both quotes —
                inside FSI…PDI. Inside the isolate, all neutrals resolve
                within the sealed context; outside, the surrounding English
                runs untouched. Both quotes end up on the correct sides of
                the Arabic phrase. Same fix in HTML:{" "}
                <code>{`He said <bdi>"مرحبا يا صديقي"</bdi> and waved.`}</code>
              </p>
            </div>

            <div className="p-2 rounded bg-white border border-neutral-200 space-y-2">
              <p className="font-semibold text-neutral-800">
                Failure #3: A cursor arrow-key that feels &quot;right&quot;
                moves you further from where you meant to edit.
              </p>
              <p>
                Memory: <code>The word مرحبا means hello.</code> — cursor
                sits between the last Arabic letter and the following
                space. You press → (right-arrow) expecting to move
                &quot;forward&quot; in the sentence. But right-arrow moves
                by <em>logical</em> order, one code point forward in
                memory. In this position, the next code point is the space
                — which visually sits between the Arabic word and{" "}
                <code>means</code>. So you moved from the RIGHT edge of
                the Arabic (visually) into the space that comes AFTER the
                Arabic visually — which is to the RIGHT. Feels correct.
              </p>
              <p>
                But if the cursor sits BEFORE the first Arabic letter (at
                the boundary between the opening space and{" "}
                <code>مـ</code>), right-arrow moves logically forward —
                onto the first Arabic letter — which visually sits at the
                RIGHT edge of the Arabic word. So cursor jumps a whole
                word to the RIGHT visually.
              </p>
              <p className="text-neutral-800 font-medium">Fix:</p>
              <p>
                There isn&apos;t a per-string fix; this is a UX-level
                choice by the OS/editor. Three options:
              </p>
              <ul className="list-disc pl-4">
                <li>
                  <b>Enable &quot;RTL cursor&quot; mode</b> — macOS: System
                  Settings → Keyboard → Text Input → &quot;Move cursor
                  visually in RTL text.&quot; Windows: same option in the
                  Language settings. In this mode arrow keys move by
                  VISUAL order regardless of paragraph direction. Right-
                  arrow always moves right on screen.
                </li>
                <li>
                  <b>Use Home / End</b> for edge-of-line navigation instead
                  of many arrow presses — these are direction-invariant.
                </li>
                <li>
                  <b>For programmatic cursor placement</b> (test tools,
                  IDE plugins) — always calculate positions from character
                  indices in the STRING, not from screen coordinates.
                  The mental model must be logical order.
                </li>
              </ul>
            </div>
          </div>
        </details>

        {/* Cursor behavior explainer */}
        <details className="border border-neutral-200 rounded p-3 bg-neutral-50">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-800 list-none flex items-center gap-2">
            <span className="text-neutral-400">▸</span> How the cursor moves in bidi text
          </summary>
          <div className="mt-3 text-xs text-neutral-700 leading-relaxed space-y-2">
            <p>
              Cursor movement in bidi text is one of the least-intuitive
              parts of the algorithm, and the source of a huge share of
              user complaints. Here is the rule and the reasoning.
            </p>

            <p>
              <b>The rule:</b> arrow keys move by <em>logical</em> order
              by default. → advances the cursor to the next code point in
              memory. ← moves to the previous. This is true regardless of
              which direction that character is visually rendered.
            </p>

            <p>
              <b>Why logical, not visual?</b> Because &quot;next character&quot;
              in a mixed-direction string is ambiguous visually. Consider
              <code> The word مرحبا means hello.</code> If the cursor sits
              between the <code>d</code> of &quot;word&quot; and the space
              before Arabic, what should → do?
            </p>
            <ul className="list-disc pl-4">
              <li>
                Logical answer: move onto the space (memory index +1).
                Visually the cursor jumps to sit before the LAST Arabic
                letter (rightmost), because that&apos;s where the Arabic
                word&apos;s first-memory-position renders.
              </li>
              <li>
                Visual answer: move one pixel to the right. But the next
                thing to the right IS the space, which is between
                &quot;word&quot; and the Arabic word visually and
                logically. So visual and logical happen to agree here.
              </li>
            </ul>
            <p>
              But now cursor is inside the Arabic word&apos;s space
              boundary. Press → again. Logically it moves to <code>م</code>{" "}
              (first memory position of Arabic). Visually{" "}
              <code>م</code> sits on the RIGHT edge of the word — so the
              cursor visually jumps across the whole Arabic word to the
              right. Visual answer would have moved it LEFT (into the last
              visually-rendered Arabic letter, which is the LAST-memory
              letter). Logical and visual now disagree.
            </p>

            <p>
              <b>Design tradeoff:</b> Unicode&apos;s original choice was
              logical because it&apos;s <em>predictable</em> — cursor
              position = memory index, no ambiguity. But it&apos;s
              <em> unintuitive</em> at bidi boundaries. Windows shipped a
              &quot;visual arrow keys&quot; toggle in NT 4.0 (1996) and
              macOS added one in 10.3. Both are OFF by default; power
              users of Arabic/Hebrew often turn them on.
            </p>

            <p>
              <b>Two more cursor gotchas worth knowing:</b>
            </p>
            <ul className="list-disc pl-4">
              <li>
                <b>Home / End are direction-invariant.</b> Home goes to
                logical START (visual left in LTR paragraph, visual right
                in RTL paragraph). End goes to logical end. These usually
                do what you want because &quot;beginning of the line&quot;
                and &quot;end of the line&quot; are direction-relative
                concepts.
              </li>
              <li>
                <b>Backspace deletes the LOGICALLY previous char.</b>{" "}
                That may be visually to the left OR right of the cursor
                depending on what you just typed. In Hebrew or Arabic
                context, backspace visually deletes to the LEFT (which
                is &quot;forward&quot; in RTL reading), not to the right
                as LTR users expect.
              </li>
            </ul>

            <p>
              <b>For programmers:</b> DOM APIs (<code>selectionStart</code>,{" "}
              <code>textRange</code>, <code>substring</code>) all work in
              logical order. A cursor at index 5 is always the same
              memory position, regardless of what pixel it&apos;s
              rendered at. If you compute cursor positions from mouse
              clicks (e.g., a canvas-based text editor), you have to
              call <code>document.caretPositionFromPoint()</code> or the
              equivalent — never assume &quot;X pixels from left&quot; =
              &quot;X characters into the string.&quot;
            </p>
          </div>
        </details>

        <p className="text-xs text-neutral-600 pt-1">
          Each case below shows one specific bidi phenomenon. Click the{" "}
          <span className="font-medium">Load</span> button on any case to
          push its text into the analyzer above and see the runs, logical
          order, and per-character inspector all update.
        </p>
        {TUTORIAL_CASES.map((c, i) => (
          <details
            key={i}
            className="border border-neutral-200 rounded p-3 hover:border-neutral-300 [&_summary::-webkit-details-marker]:hidden"
            open={i === 0}
          >
            <summary className="cursor-pointer text-sm font-medium text-neutral-800 flex items-baseline justify-between gap-3">
              <span>{c.title}</span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onLoad(c.text); }}
                className="text-xs px-2 py-0.5 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 shrink-0"
              >
                Load →
              </button>
            </summary>
            <div className="mt-3 space-y-2">
              <div
                className="p-2 rounded bg-neutral-50 border border-neutral-200 text-lg leading-relaxed break-words"
                dir={c.paragraphDir ?? "auto"}
              >
                {c.text}
              </div>
              <p className="text-xs text-neutral-700 leading-relaxed">
                {c.explain}
              </p>
            </div>
          </details>
        ))}
        <div className="mt-4 p-3 rounded bg-sky-50 border border-sky-200 text-xs text-sky-900">
          <p className="font-medium mb-1">Summary — how to make bidi predictable</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <b>Quotes are not isolation.</b> They&apos;re neutrals that
              happen to resolve nicely in the simplest cases. Don&apos;t rely
              on them once a sentence has multiple bidi transitions,
              trailing punctuation, or user-supplied text.
            </li>
            <li>
              <b>Isolate with intent.</b> Wrap every user-supplied name,
              quoted phrase, or bidi-unknown chunk in{" "}
              <code>&lt;bdi&gt;</code> (HTML), FSI…PDI (Unicode), or an
              element with <code>unicode-bidi: isolate</code> (CSS). This is
              the same thing three ways.
            </li>
            <li>
              <b>Never store legacy overrides.</b> Avoid LRE/RLE/LRO/RLO/PDF
              in persisted content — they cascade badly across paste
              boundaries and enable the RLO attack. Use isolates.
            </li>
          </ul>
        </div>
      </div>
    </details>
  );
}
