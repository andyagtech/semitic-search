import { createClient } from "@libsql/client";

let cached: ReturnType<typeof createClient> | null = null;

export function db() {
  if (cached) return cached;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set.");
  cached = createClient({ url, authToken });
  return cached;
}

export type Entry = {
  id: number;
  lang: string;
  word: string;
  etymology_number: number | null;
  pos: string;
  root: string | null;
  vocalized_form: string | null;
  romanization: string | null;
  glosses_json: string;
  etymology_text: string | null;
  wiktionary_title: string;
};
