// Tiny build-time manifest of which root-family pages actually exist.
// Used so the search-result UI can conditionally show an "Explore root family"
// link only when we have data to back the page.

import { readFileSync } from "fs";
import { join } from "path";

let _slugs: Set<string> | null = null;

export function familySlugs(): Set<string> {
  if (_slugs) return _slugs;
  const path = join(process.cwd(), "public", "data", "root_families.json");
  try {
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw) as Array<{ slug: string }>;
    _slugs = new Set(data.map((f) => f.slug));
  } catch {
    _slugs = new Set();
  }
  return _slugs;
}
