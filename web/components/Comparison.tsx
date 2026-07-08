"use client";

/**
 * Wikipedia-style comparison table for Semitic languages.
 *
 * Sibling to Turkic Search's Comparison component. Rows are concepts (for
 * vocabulary tables) or sound-law features (for isogloss tables). Columns
 * are languages, grouped and color-coded by branch, deepest-attested first.
 * Cells hold string[]; first entry is the primary script, later entries
 * are alternates (romanizations, coexisting scripts). Proto-Semitic is
 * shown as the rightmost column so language cells have room to breathe.
 */

import { useState } from "react";
import type {
  ComparisonTable, ComparisonRow, Branch,
} from "@/lib/comparison";
import {
  LANGUAGE_ORDER, LANGUAGE_BRANCH, LANGUAGE_NAME, BRANCH_LABEL, BRANCH_CLASS,
} from "@/lib/comparison";
import type { LanguageCode } from "@/lib/models";

function branchGroups(): { branch: Branch; span: number; langs: LanguageCode[] }[] {
  const groups: { branch: Branch; span: number; langs: LanguageCode[] }[] = [];
  for (const lang of LANGUAGE_ORDER) {
    const b = LANGUAGE_BRANCH[lang];
    const last = groups[groups.length - 1];
    if (last && last.branch === b) {
      last.span += 1;
      last.langs.push(lang);
    } else {
      groups.push({ branch: b, span: 1, langs: [lang] });
    }
  }
  return groups;
}

function renderCell(forms: string[] | undefined, primaryOnly: boolean): string {
  if (!forms || forms.length === 0) return "—";
  if (primaryOnly) return forms[0];
  return forms.join("  ·  ");
}

export function Comparison({ table }: { table: ComparisonTable }) {
  const [primaryOnly, setPrimaryOnly] = useState(false);
  const groups = branchGroups();
  const hasProtoCol = table.rows.some((r) => r.proto || r.isogloss);
  const hasGlossCol = table.kind === "isogloss";

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={primaryOnly}
            onChange={(e) => setPrimaryOnly(e.target.checked)}
            className="accent-current"
          />
          <span>Only primary orthography</span>
        </label>
        <span className="text-xs text-neutral-500">
          (hides romanizations and secondary scripts)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="comparison-table">
          <caption>{table.description}</caption>
          <thead>
            <tr>
              <th rowSpan={2}>{table.kind === "isogloss" ? "Isogloss" : "Concept"}</th>
              {hasGlossCol && <th rowSpan={2}>Gloss</th>}
              {groups.map((g, i) => (
                <th
                  key={i}
                  colSpan={g.span}
                  className={`branch-header ${BRANCH_CLASS[g.branch]}`}
                >
                  {BRANCH_LABEL[g.branch]}
                </th>
              ))}
              {hasProtoCol && <th rowSpan={2}>Proto-Semitic</th>}
            </tr>
            <tr>
              {LANGUAGE_ORDER.map((lang) => (
                <th
                  key={lang}
                  className={`branch ${BRANCH_CLASS[LANGUAGE_BRANCH[lang]]}`}
                >
                  {LANGUAGE_NAME[lang]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, idx) => (
              <RowGroup
                key={idx}
                row={row}
                hasProtoCol={hasProtoCol}
                hasGlossCol={hasGlossCol}
                primaryOnly={primaryOnly}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowGroup({
  row, hasProtoCol, hasGlossCol, primaryOnly,
}: {
  row: ComparisonRow;
  hasProtoCol: boolean;
  hasGlossCol: boolean;
  primaryOnly: boolean;
}) {
  return (
    <>
      <tr>
        <td className="row-label">{row.label}</td>
        {hasGlossCol && <td>{row.gloss ?? ""}</td>}
        {LANGUAGE_ORDER.map((lang) => {
          const forms = row.cells[lang];
          const empty = !forms || forms.length === 0;
          return (
            <td
              key={lang}
              className={`branch ${BRANCH_CLASS[LANGUAGE_BRANCH[lang]]} ${empty ? "empty" : ""}`}
            >
              {renderCell(forms, primaryOnly)}
            </td>
          );
        })}
        {hasProtoCol && (
          <td className="row-proto">{row.proto ?? row.isogloss ?? ""}</td>
        )}
      </tr>
    </>
  );
}
