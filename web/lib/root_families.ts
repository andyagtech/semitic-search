import { readFileSync } from "fs";
import { join } from "path";
import type { RootFamily } from "./root_types";

export { RTL_LANGS } from "./root_types";
export type { RootFamily, RootLemma } from "./root_types";

let _cache: RootFamily[] | null = null;

export function allFamilies(): RootFamily[] {
  if (_cache) return _cache;
  const path = join(process.cwd(), "public", "data", "root_families.json");
  const raw = readFileSync(path, "utf-8");
  _cache = JSON.parse(raw) as RootFamily[];
  return _cache;
}

export function familyBySlug(slug: string): RootFamily | null {
  const families = allFamilies();
  return families.find((f) => f.slug === slug) ?? null;
}
