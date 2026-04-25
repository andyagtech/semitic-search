import OpenAI from "openai";
import { z } from "zod";
import type { SemiticSearchResult } from "./models";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
// Perplexity's online search model — every response is grounded in fresh web
// sources and accompanied by a `citations` array of URLs.
const VALIDATOR_MODEL =
  process.env.SEMITIC_SEARCH_VALIDATOR_MODEL ?? "perplexity/sonar-pro";

function client() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return new OpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL });
}

const Citation = z.object({
  url: z.string(),
  title: z.string().nullable().optional(),
  quote: z.string().nullable().optional(),
});

const CognateVerdict = z.object({
  cognate_index: z.number().int(),
  language: z.string(),
  surface_form: z.string(),
  verdict: z.enum(["agree", "disagree", "unsure"]),
  reason: z.string(),
  citations: z.array(Citation).default([]),
});

const MissedCognate = z.object({
  language: z.string(),
  surface_form: z.string(),
  gloss: z.string(),
  reason: z.string(),
  citations: z.array(Citation).default([]),
});

export const ValidationResult = z.object({
  overall_agreement: z.enum(["high", "mixed", "low"]),
  root_verdict: z.enum(["agree", "disagree", "unsure"]),
  root_reason: z.string().nullable().optional(),
  cognate_verdicts: z.array(CognateVerdict).default([]),
  missed_cognates: z.array(MissedCognate).default([]),
  overall_notes: z.string(),
  raw_citations: z.array(z.string()).default([]),
});
export type ValidationResult = z.infer<typeof ValidationResult>;

const SYSTEM = `You are an independent, web-grounded fact-checker for a Semitic-\
linguistics analysis tool. You will receive a JSON object with an extracted \
Semitic root and a list of proposed cross-language cognates. Your job is to \
verify each claim against real scholarly / lexicographic sources on the web \
(Wiktionary; Klein's Etymological Dictionary of Hebrew; Gesenius; Brockelmann's \
Syriac lexicon; Leslau's Comparative Dictionary of Ge'ez; the Comprehensive \
Aramaic Lexicon cal.huc.edu; Wikipedia entries on the specific root; Sefaria).

For EACH cognate in the input list, render a verdict — agree / disagree / \
unsure — with a one-sentence reason and 1–3 citation URLs that support or \
refute the claim. Prefer primary lexica and Wiktionary pages for the exact \
lemma; avoid generic Wikipedia when a lexicon entry exists.

Also list well-attested cognates that the input MISSED (same rigor, same \
citation requirement).

Output ONLY a single JSON object matching exactly this schema — no markdown \
fences, no prose outside JSON:

{
  "overall_agreement": "high" | "mixed" | "low",
  "root_verdict": "agree" | "disagree" | "unsure",
  "root_reason": "short string or null",
  "cognate_verdicts": [
    {
      "cognate_index": <int, 0-based index into input cognates>,
      "language": "lang code",
      "surface_form": "form",
      "verdict": "agree" | "disagree" | "unsure",
      "reason": "one sentence",
      "citations": [{"url": "https://...", "title": "page title", "quote": "short relevant quote"}]
    }
  ],
  "missed_cognates": [
    {"language": "code", "surface_form": "form", "gloss": "gloss", "reason": "why missed", "citations": [...]}
  ],
  "overall_notes": "one paragraph"
}

Be strict. If a cited source doesn't actually support the claim, render disagree. \
Do not invent URLs.`;

// Strip a ```json ... ``` fence if the model emits one despite instructions.
function unfence(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  return m ? m[1].trim() : s.trim();
}

export async function validateResult(
  result: SemiticSearchResult,
): Promise<ValidationResult> {
  const openai = client();
  const payload = JSON.stringify(
    {
      input_word: result.input_word,
      detected_language: result.detected_language,
      extracted_root: result.extracted_root,
      root_type: result.root_type,
      cognates: result.cognates.map((c, i) => ({
        index: i,
        language: c.language,
        language_name: c.language_name,
        surface_form: c.surface_form,
        surface_root: c.surface_root,
        gloss: c.gloss,
        confidence: c.confidence,
      })),
    },
    null,
    2,
  );

  const completion = await openai.chat.completions.create(
    {
      model: VALIDATOR_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content:
            "Fact-check the following Semitic Search analysis. Use web search. Return the JSON as specified — nothing else.\n\nINPUT:\n" +
            payload,
        },
      ],
      max_tokens: 4000,
    },
    {
      headers: {
        "HTTP-Referer": "https://semitic-search.andy-barr.com",
        "X-Title": "Semitic Search validator",
      },
    },
  );

  const raw = unfence(completion.choices[0]?.message?.content ?? "");
  if (!raw) throw new Error("validator returned empty content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`validator returned non-JSON: ${raw.slice(0, 400)}`);
  }

  // OpenRouter passes Perplexity's top-level `citations` array through on the
  // completion object; fall back to empty.
  type PerplexityCompletion = typeof completion & { citations?: string[] };
  const raw_citations: string[] = (completion as PerplexityCompletion).citations ?? [];
  const validated = ValidationResult.parse({ ...(parsed as object), raw_citations });
  return validated;
}
