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
    label: "Trilingual — English + Hebrew + Arabic in one sentence",
    text: "We visited אורשלים · أورشليم, called Jerusalem in English.",
    note: "Same city named three ways. The two RTL scripts sit inside an LTR sentence; watch the punctuation and the middle-dot separator flip based on their neighbors.",
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
    label: "Hebrew comment in code",
    text: "const greeting = \"שלום\"; // ברכה",
    note: "Semicolons and slashes flip; cursor traversal jumps.",
  },
  {
    label: "Arabic comment in code",
    text: "const city = \"أورشليم\"; // مدينة",
    note: "Even inside a string literal, the AL run sucks the trailing quote+semicolon into the RTL span.",
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
          10 progressively gnarlier cases · click any to load into the tool
        </span>
      </summary>
      <div className="mt-4 space-y-3">
        <p className="text-xs text-neutral-600">
          Each case shows one specific bidi phenomenon. Click the{" "}
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
