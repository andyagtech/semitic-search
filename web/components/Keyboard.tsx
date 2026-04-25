"use client";

// Layouts grouped in rows. Same order as the conventional alphabet per script
// so a user familiar with the script finds letters quickly. Finals at the end
// for Hebrew.

export const ARABIC_LAYOUT: string[][] = [
  ["ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر"],
  ["ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف"],
  ["ق", "ك", "ل", "م", "ن", "ه", "و", "ي", "ى", "ة"],
  ["ء", "أ", "إ", "آ", "ؤ", "ئ", " "],
];

export const HEBREW_LAYOUT: string[][] = [
  ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י"],
  ["כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר"],
  ["ש", "ת", "ך", "ם", "ן", "ף", "ץ", " "],
];

export const SYRIAC_LAYOUT: string[][] = [
  ["ܐ", "ܒ", "ܓ", "ܕ", "ܗ", "ܘ", "ܙ", "ܚ", "ܛ", "ܝ"],
  ["ܟ", "ܠ", "ܡ", "ܢ", "ܣ", "ܥ", "ܦ", "ܨ", "ܩ", "ܪ"],
  ["ܫ", "ܬ", " "],
];

const LAYOUTS: Record<string, { label: string; dir: "rtl" | "ltr"; rows: string[][] }> = {
  ar: { label: "العربية", dir: "rtl", rows: ARABIC_LAYOUT },
  he: { label: "עברית", dir: "rtl", rows: HEBREW_LAYOUT },
  syc: { label: "ܣܘܪܝܝܐ", dir: "rtl", rows: SYRIAC_LAYOUT },
};

export type KeyboardScript = keyof typeof LAYOUTS;
export const KEYBOARD_SCRIPTS = Object.keys(LAYOUTS) as KeyboardScript[];

export function Keyboard({
  script,
  onSetScript,
  onPress,
  onBackspace,
  onClear,
}: {
  script: KeyboardScript;
  onSetScript: (s: KeyboardScript) => void;
  onPress: (ch: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}) {
  const layout = LAYOUTS[script];
  return (
    <div className="mt-3 border border-neutral-200 rounded-lg p-3 bg-neutral-50">
      <div className="flex gap-1 mb-2 flex-wrap">
        {KEYBOARD_SCRIPTS.map((s) => (
          <button
            key={s}
            onClick={() => onSetScript(s)}
            className={`px-2 py-1 text-xs rounded border transition ${
              s === script
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white border-neutral-300 hover:border-neutral-500"
            }`}
          >
            {LAYOUTS[s].label}
          </button>
        ))}
        <span className="flex-1" />
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            onBackspace();
          }}
          className="px-2 py-1 text-xs rounded border border-neutral-300 bg-white hover:bg-neutral-100"
          title="Delete last character"
        >
          ⌫
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            onClear();
          }}
          className="px-2 py-1 text-xs rounded border border-neutral-300 bg-white hover:bg-neutral-100"
          title="Clear"
        >
          clear
        </button>
      </div>
      <div dir={layout.dir} className="space-y-1">
        {layout.rows.map((row, ri) => (
          <div key={ri} className="flex gap-1 justify-center flex-wrap">
            {row.map((ch, ci) => (
              <button
                key={`${ri}-${ci}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPress(ch);
                }}
                className="min-w-11 h-11 sm:min-w-10 sm:h-10 px-2 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-xl font-[system-ui] active:bg-neutral-200"
              >
                {ch === " " ? "␣" : ch}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
