"use client";

import { useState } from "react";

// Approximate geographic centroids for the "classic" speech-area of each
// Semitic language (not modern distribution). Units are SVG coordinates
// within a 800×520 viewBox representing the broader Semitic world from
// eastern Mediterranean through Arabia and the Horn of Africa.
//
// Layout tuned for legibility — real geography is roughly preserved but
// labels are arranged so they don't overlap.
const LANGS: {
  code: string;
  name: string;
  x: number;
  y: number;
  /** Reflexes of the 9 key PS phonemes. Kept in lockstep with the matrix
   *  on /linguistics. A bare value (e.g. "ṯ") = identity preservation;
   *  a different value = merger; "-" = phoneme lost. */
  reflexes: Record<string, string>;
}[] = [
  { code: "akk", name: "Akkadian", x: 550, y: 180,
    reflexes: { "*ṯ": "š", "*ḏ": "z", "*ḍ": "ṣ", "*ẓ": "ṣ", "*ḫ": "ḫ", "*ġ": "-", "*ś": "š", "*š": "š", "*ṣ": "ṣ" } },
  { code: "ug",  name: "Ugaritic", x: 350, y: 200,
    reflexes: { "*ṯ": "ṯ", "*ḏ": "ḏ", "*ḍ": "ṣ", "*ẓ": "ẓ", "*ḫ": "ḫ", "*ġ": "ġ", "*ś": "š", "*š": "š", "*ṣ": "ṣ" } },
  { code: "phn", name: "Phoenician", x: 335, y: 240,
    reflexes: { "*ṯ": "š", "*ḏ": "z", "*ḍ": "ṣ", "*ẓ": "ṣ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "s", "*š": "š", "*ṣ": "ṣ" } },
  { code: "pun", name: "Punic", x: 180, y: 260,
    reflexes: { "*ṯ": "š", "*ḏ": "z", "*ḍ": "ṣ", "*ẓ": "ṣ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "s", "*š": "š", "*ṣ": "ṣ" } },
  { code: "he",  name: "Hebrew", x: 360, y: 265,
    reflexes: { "*ṯ": "š", "*ḏ": "z", "*ḍ": "ṣ", "*ẓ": "ṣ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "ś", "*š": "š", "*ṣ": "ṣ" } },
  { code: "arc", name: "Imperial Aramaic", x: 440, y: 220,
    reflexes: { "*ṯ": "t", "*ḏ": "d", "*ḍ": "q/ʿ", "*ẓ": "ṭ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "s", "*š": "š", "*ṣ": "ṣ" } },
  { code: "syc", name: "Syriac", x: 460, y: 200,
    reflexes: { "*ṯ": "t", "*ḏ": "d", "*ḍ": "ʿ", "*ẓ": "ṭ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "s", "*š": "š", "*ṣ": "ṣ" } },
  { code: "aii", name: "Assyrian NA", x: 490, y: 210,
    reflexes: { "*ṯ": "t", "*ḏ": "d", "*ḍ": "ʿ", "*ẓ": "ṭ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "s", "*š": "š", "*ṣ": "ṣ" } },
  { code: "tru", name: "Turoyo", x: 450, y: 185,
    reflexes: { "*ṯ": "t", "*ḏ": "d", "*ḍ": "ʿ", "*ẓ": "ṭ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "s", "*š": "š", "*ṣ": "ṣ" } },
  { code: "mid", name: "Mandaic", x: 540, y: 230,
    reflexes: { "*ṯ": "t", "*ḏ": "d", "*ḍ": "ʿ", "*ẓ": "ṭ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "s", "*š": "š", "*ṣ": "ṣ" } },
  { code: "amw", name: "Western NA", x: 370, y: 230,
    reflexes: { "*ṯ": "t", "*ḏ": "d", "*ḍ": "ʿ", "*ẓ": "ṭ", "*ḫ": "ḥ", "*ġ": "ʿ", "*ś": "s", "*š": "š", "*ṣ": "ṣ" } },
  { code: "ar",  name: "Arabic", x: 450, y: 330,
    reflexes: { "*ṯ": "ṯ", "*ḏ": "ḏ", "*ḍ": "ḍ", "*ẓ": "ẓ", "*ḫ": "ḫ", "*ġ": "ġ", "*ś": "š", "*š": "s", "*ṣ": "ṣ" } },
  { code: "sab", name: "Sabaean", x: 460, y: 410,
    reflexes: { "*ṯ": "ṯ", "*ḏ": "ḏ", "*ḍ": "ḍ", "*ẓ": "ẓ", "*ḫ": "ḫ", "*ġ": "ġ", "*ś": "ś", "*š": "s₁", "*ṣ": "ṣ" } },
  { code: "osa", name: "Old South Arabian", x: 480, y: 430,
    reflexes: { "*ṯ": "ṯ", "*ḏ": "ḏ", "*ḍ": "ḍ", "*ẓ": "ẓ", "*ḫ": "ḫ", "*ġ": "ġ", "*ś": "ś", "*š": "s₁", "*ṣ": "ṣ" } },
  { code: "gez", name: "Ge'ez", x: 410, y: 450,
    reflexes: { "*ṯ": "s", "*ḏ": "z", "*ḍ": "ḍ", "*ẓ": "ṣ", "*ḫ": "ḫ", "*ġ": "ʿ", "*ś": "ś", "*š": "s", "*ṣ": "ṣ" } },
  { code: "am",  name: "Amharic", x: 395, y: 475,
    reflexes: { "*ṯ": "s", "*ḏ": "z", "*ḍ": "ṭ", "*ẓ": "ṣ", "*ḫ": "-", "*ġ": "-", "*ś": "s", "*š": "s", "*ṣ": "ṣ" } },
  { code: "ti",  name: "Tigrinya", x: 420, y: 470,
    reflexes: { "*ṯ": "s", "*ḏ": "z", "*ḍ": "ḍ", "*ẓ": "ṣ", "*ḫ": "-", "*ġ": "-", "*ś": "s", "*š": "s", "*ṣ": "ṣ" } },
];

const PS_PHONEMES = ["*ṯ", "*ḏ", "*ḍ", "*ẓ", "*ḫ", "*ġ", "*ś", "*š", "*ṣ"];

type Status = "preserved" | "merged" | "lost";

function classify(phoneme: string, reflex: string): Status {
  if (reflex === "-") return "lost";
  const bare = phoneme.replace("*", "");
  if (reflex === bare || reflex.startsWith(bare)) return "preserved";
  return "merged";
}

const STATUS_FILL: Record<Status, string> = {
  preserved: "#059669",  // emerald-600
  merged:    "#d97706",  // amber-600
  lost:      "#737373",  // neutral-500
};

export function IsoglossMap() {
  const [selected, setSelected] = useState<string>("*ḍ");
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div>
      <section className="mb-4 bg-white border border-neutral-200 rounded-lg p-4">
        <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
          Pick a Proto-Semitic phoneme
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PS_PHONEMES.map((p) => (
            <button
              key={p}
              onClick={() => setSelected(p)}
              className={`text-sm font-mono px-2.5 py-1 rounded border transition ${
                selected === p
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white border border-neutral-200 rounded-lg p-4">
        <svg
          viewBox="0 0 800 520"
          className="w-full h-auto"
          role="img"
          aria-label="Semitic isogloss map"
        >
          <defs>
            <linearGradient id="sea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#dbeafe" />
              <stop offset="100%" stopColor="#bfdbfe" />
            </linearGradient>
          </defs>
          {/* Sea backdrop */}
          <rect x="0" y="0" width="800" height="520" fill="url(#sea)" />

          {/* Stylized landmasses: Levant, Mesopotamia, Arabia, Horn of Africa */}
          <path
            d="M 150 110 Q 250 80 400 120 L 550 140 Q 640 180 620 260 L 580 340 Q 520 440 480 480 L 430 500 Q 380 510 360 480 L 330 400 L 280 340 Q 200 310 180 250 L 160 180 Z"
            fill="#fef3c7"
            stroke="#d97706"
            strokeWidth="1"
            opacity="0.8"
          />
          <path
            d="M 360 440 Q 400 465 440 480 L 470 500 Q 440 515 400 510 L 370 490 Z"
            fill="#fef3c7"
            stroke="#d97706"
            strokeWidth="1"
            opacity="0.8"
          />

          {/* Region labels */}
          <text x="250" y="170" className="text-xs" fill="#78350f" fontSize="11" fontStyle="italic">Levant</text>
          <text x="500" y="170" className="text-xs" fill="#78350f" fontSize="11" fontStyle="italic">Mesopotamia</text>
          <text x="430" y="380" className="text-xs" fill="#78350f" fontSize="11" fontStyle="italic">Arabia</text>
          <text x="385" y="505" className="text-xs" fill="#78350f" fontSize="11" fontStyle="italic">Horn of Africa</text>

          {/* Language dots */}
          {LANGS.map((L) => {
            const reflex = L.reflexes[selected] ?? "?";
            const status = classify(selected, reflex);
            const fill = STATUS_FILL[status];
            const isHovered = hovered === L.code;
            return (
              <g
                key={L.code}
                onMouseEnter={() => setHovered(L.code)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={L.x}
                  cy={L.y}
                  r={isHovered ? 11 : 8}
                  fill={fill}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={L.x + 12}
                  y={L.y + 4}
                  fontSize={isHovered ? 13 : 11}
                  fontWeight={isHovered ? "600" : "400"}
                  fill="#171717"
                >
                  {L.name}
                </text>
                <text
                  x={L.x + 12}
                  y={L.y + 18}
                  fontSize="10"
                  fontFamily="monospace"
                  fill={fill}
                  fontWeight="600"
                >
                  → {reflex}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap gap-4 text-xs text-neutral-600 mt-3">
          <span><span className="inline-block w-3 h-3 rounded-full bg-emerald-600 mr-1 align-middle" />preserved</span>
          <span><span className="inline-block w-3 h-3 rounded-full bg-amber-600 mr-1 align-middle" />merged with another phoneme</span>
          <span><span className="inline-block w-3 h-3 rounded-full bg-neutral-500 mr-1 align-middle" />lost from inventory</span>
        </div>
      </section>

      <section className="mt-5 bg-white border border-neutral-200 rounded-lg p-4 text-sm text-neutral-700">
        <h3 className="font-semibold mb-1">What you&apos;re looking at</h3>
        <p className="mb-2">
          The Semitic family descends from a Proto-Semitic parent with a
          distinctive set of 29 consonants. Each daughter language kept some
          and merged or lost others. Selecting a PS phoneme above shows
          <b> where in the family it survived as a distinct sound</b> (green)
          <b> vs. where it merged</b> with another phoneme (amber) or
          <b> dropped out entirely</b> (gray).
        </p>
        <p className="text-xs text-neutral-500 italic">
          Example: PS *ḍ (emphatic lateral) is preserved as Arabic ض, merged
          with *ṣ in Hebrew (צ) and Akkadian, and became ʿ in Aramaic/Syriac.
          This is why the triliteral root *ʾ-r-ḍ "earth" appears as Ar arḍ,
          Heb érets, Syc arʿā.
        </p>
      </section>
    </div>
  );
}
