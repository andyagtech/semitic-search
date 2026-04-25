import OpenAI from "openai";
import { z } from "zod";
import { SemiticSearchResult } from "./models";
import { SYSTEM_PROMPT } from "./prompt";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "google/gemini-3.1-pro-preview";
// If the primary returns empty content (intermittent OpenRouter+Gemini issue),
// fall back to a different lab. Kept in this order so the normal case stays
// on the model the user expects to see in the footer.
const FALLBACK_MODELS = [
  "google/gemini-2.5-pro",
  "anthropic/claude-opus-4.5",
];

function client() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set.");
  }
  return new OpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL });
}

function schemaForPrompt() {
  // Inline the JSON Schema so the model gets concrete field names/types/enums.
  // Zod 4 ships JSON Schema export built-in — no openai helper needed.
  const raw = z.toJSONSchema(SemiticSearchResult);
  return JSON.stringify(raw, null, 2);
}

export type SearchUsage = {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
};

async function callOnce(
  openai: OpenAI,
  model: string,
  systemWithSchema: string,
  word: string,
) {
  return openai.chat.completions.create(
    {
      model,
      max_tokens: 16000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemWithSchema },
        { role: "user", content: `Analyze this word: ${word}` },
      ],
    },
    {
      headers: {
        "HTTP-Referer": "https://semitic-search.andy-barr.com",
        "X-Title": "Semitic Search",
      },
    },
  );
}

export async function runSearch(
  word: string,
): Promise<{ result: SemiticSearchResult; usage: SearchUsage }> {
  const openai = client();
  const primary = process.env.SEMITIC_SEARCH_PRIMARY_MODEL ?? DEFAULT_MODEL;
  const chain = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];

  const systemWithSchema =
    SYSTEM_PROMPT +
    "\n\n# OUTPUT SCHEMA (JSON Schema)\nReturn a single JSON object (no markdown fences, no prose) matching:\n\n" +
    schemaForPrompt();

  let lastErr: Error | null = null;
  for (const model of chain) {
    try {
      const completion = await callOnce(openai, model, systemWithSchema, word);
      const raw = completion.choices[0]?.message.content?.trim() ?? "";
      if (!raw) {
        lastErr = new Error(
          `${model} returned empty content. finish_reason=${completion.choices[0]?.finish_reason}`,
        );
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        lastErr = new Error(`Non-JSON response from ${model}: ${raw.slice(0, 400)}`);
        continue;
      }
      const result = SemiticSearchResult.parse(parsed);
      const usage: SearchUsage = {
        model,
        input_tokens: completion.usage?.prompt_tokens ?? 0,
        output_tokens: completion.usage?.completion_tokens ?? 0,
        cache_read_tokens: completion.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      };
      return { result, usage };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error("All search models failed");
}
