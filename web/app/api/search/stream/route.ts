import { NextRequest } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { parse as parsePartial, Allow } from "partial-json";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { SemiticSearchResult } from "@/lib/models";
import { toNative, type RomanizationScheme } from "@/lib/romanization";
import { verifyOne } from "@/lib/verify";

export const runtime = "nodejs";
// LLM + verification. 60s covers the p95 on Pro tier.
export const maxDuration = 60;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "google/gemini-3.1-pro-preview";

function openaiClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return new OpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL });
}

function schemaForPrompt() {
  return JSON.stringify(z.toJSONSchema(SemiticSearchResult), null, 2);
}

type SSESend = (event: string, data: unknown) => void;

async function runStreaming(
  word: string,
  model: string,
  send: SSESend,
): Promise<{ result: z.infer<typeof SemiticSearchResult>; usage: { prompt: number; completion: number } } | null> {
  const openai = openaiClient();
  const systemWithSchema =
    SYSTEM_PROMPT +
    "\n\n# OUTPUT SCHEMA (JSON Schema)\nReturn a single JSON object (no markdown fences, no prose) matching:\n\n" +
    schemaForPrompt();

  const stream = await openai.chat.completions.create(
    {
      model,
      max_tokens: 16000,
      response_format: { type: "json_object" },
      stream: true,
      stream_options: { include_usage: true },
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

  let accumulated = "";
  let rootEmitted = false;
  let emittedCognateCount = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content ?? "";
    if (chunk.usage) {
      promptTokens = chunk.usage.prompt_tokens ?? promptTokens;
      completionTokens = chunk.usage.completion_tokens ?? completionTokens;
    }
    if (!delta) continue;
    accumulated += delta;

    let partial: any;
    try {
      // Allow every non-terminal incomplete state — strings mid-stream, arrays,
      // objects, everything. partial-json closes open structures on the fly.
      partial = parsePartial(accumulated, Allow.ALL);
    } catch {
      continue;
    }
    if (typeof partial !== "object" || partial === null) continue;

    // Emit the root/proto shape as soon as it's complete enough.
    if (!rootEmitted && partial.extracted_root && Array.isArray(partial.proto_slots) && partial.proto_slots.length >= 2) {
      rootEmitted = true;
      send("root", {
        input_word: partial.input_word ?? word,
        detected_language: partial.detected_language,
        detected_language_name: partial.detected_language_name,
        normalized_form: partial.normalized_form,
        extracted_root: partial.extracted_root,
        root_type: partial.root_type,
        root_confidence: partial.root_confidence,
        proto_slots: partial.proto_slots,
      });
    }

    // Stream each cognate the moment it has enough fields to render.
    if (Array.isArray(partial.cognates)) {
      for (let i = emittedCognateCount; i < partial.cognates.length; i++) {
        const c = partial.cognates[i];
        if (!c || typeof c !== "object") break;
        // Only emit when the essentials are present AND the object looks complete
        // (i.e., we've seen a later index start, OR gloss is fully written).
        const looksComplete =
          c.language && c.surface_form && c.gloss && c.confidence &&
          (i < partial.cognates.length - 1 || accumulated.endsWith("}") || accumulated.includes("]"));
        if (!looksComplete) break;
        send("cognate", { index: i, cognate: c });
        emittedCognateCount = i + 1;
      }
    }
  }

  // Final parse — strict — and send any remaining cognates we didn't emit mid-stream.
  let finalJson: unknown;
  try {
    finalJson = JSON.parse(accumulated);
  } catch {
    send("error", { message: "LLM returned non-JSON at stream end" });
    return null;
  }
  let finalResult;
  try {
    finalResult = SemiticSearchResult.parse(finalJson);
  } catch (e) {
    send("error", {
      message: `LLM output failed schema validation: ${e instanceof Error ? e.message : String(e)}`,
    });
    return null;
  }

  for (let i = emittedCognateCount; i < finalResult.cognates.length; i++) {
    send("cognate", { index: i, cognate: finalResult.cognates[i] });
  }

  return {
    result: finalResult,
    usage: { prompt: promptTokens, completion: completionTokens },
  };
}

export async function POST(req: NextRequest) {
  let body: { word?: string; scheme?: RomanizationScheme };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const rawWord = (body.word ?? "").trim();
  if (!rawWord) {
    return new Response(JSON.stringify({ error: "word is required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const scheme = body.scheme;
  const input = scheme ? toNative(rawWord, scheme) : rawWord;
  const model = process.env.SEMITIC_SEARCH_PRIMARY_MODEL ?? DEFAULT_MODEL;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send: SSESend = (event, data) => {
        const json = JSON.stringify(data);
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${json}\n\n`));
      };

      try {
        send("meta", {
          model,
          input,
          converted_from: scheme ? rawWord : null,
        });

        const out = await runStreaming(input, model, send);
        if (!out) {
          controller.close();
          return;
        }

        send("phase", { status: "verifying" });
        for (let i = 0; i < out.result.cognates.length; i++) {
          const v = await verifyOne(out.result.cognates[i]);
          send("verified", { index: i, cognate: v });
        }

        send("done", {
          caveats: out.result.caveats,
          usage: {
            model,
            input_tokens: out.usage.prompt,
            output_tokens: out.usage.completion,
            cache_read_tokens: 0,
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const errEvt = `event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`;
        controller.enqueue(encoder.encode(errEvt));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
