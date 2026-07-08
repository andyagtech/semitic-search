"use client";

/**
 * Renders a SemiticSearchResult as a one-row comparison table alongside the
 * existing detailed cognate list. Gives the same "pre-generated tables" feel
 * that the /table/* pages have for common searches — columns are the ten
 * Semitic languages grouped by branch, cells are surface forms plus roots.
 */

import type { SemiticSearchResult, Cognate } from "@/lib/models";
import type { ComparisonTable, ComparisonRow } from "@/lib/comparison";
import { Comparison } from "./Comparison";

type ResultLike = SemiticSearchResult | {
  cognates?: Array<Cognate & { verification?: unknown }>;
} & Omit<SemiticSearchResult, "cognates">;

export function SearchResultTable({ result }: { result: ResultLike }) {
  const table = resultAsTable(result);
  return <Comparison table={table} />;
}

function resultAsTable(result: ResultLike): ComparisonTable {
  const cells: ComparisonRow["cells"] = {};

  // Input's own language cell.
  const inputForms: string[] = [];
  if (result.input_word) inputForms.push(result.input_word);
  if (result.extracted_root && result.extracted_root !== result.input_word) {
    inputForms.push(`root: ${result.extracted_root}`);
  }
  if (inputForms.length > 0) {
    cells[result.detected_language] = inputForms;
  }

  // Cognate cells.
  for (const cog of result.cognates ?? []) {
    const forms: string[] = [];
    if (cog.surface_form) forms.push(cog.surface_form);
    if (cog.surface_root && cog.surface_root !== cog.surface_form) {
      forms.push(`(root: ${cog.surface_root})`);
    }
    if (forms.length > 0) {
      cells[cog.language] = forms;
    }
  }

  const row: ComparisonRow = {
    label: result.extracted_root ?? result.input_word,
    proto: result.extracted_root ?? undefined,
    cells,
  };

  return {
    slug: "search-result",
    title: `Comparison for "${result.input_word}"`,
    description: result.extracted_root
      ? `Reflexes of the extracted root across the family.`
      : "Cross-language forms across the family.",
    kind: "vocabulary",
    rows: [row],
  };
}
