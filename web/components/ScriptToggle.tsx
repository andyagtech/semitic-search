"use client";

import { SCRIPT_VARIANTS } from "@/lib/scripts";

/** Render a compact button row for the script/font variants of `lang`.
 *  Disappears quietly if the language has no variants defined. */
export function ScriptToggle({
  lang,
  value,
  onChange,
  compact = false,
}: {
  lang: string;
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  const options = SCRIPT_VARIANTS[lang];
  if (!options || options.length < 2) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          title={o.note}
          className={`${compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} rounded border transition ${
            value === o.id
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
