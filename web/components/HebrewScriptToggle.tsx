"use client";

import { HEBREW_SCRIPTS, type HebrewScript } from "@/lib/hebrew_scripts";

export function HebrewScriptToggle({
  value,
  onChange,
  compact = false,
}: {
  value: HebrewScript;
  onChange: (v: HebrewScript) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {HEBREW_SCRIPTS.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          title={s.note}
          className={`${compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} rounded border transition ${
            value === s.id
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
