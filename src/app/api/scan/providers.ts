// Provider-agnostic vision calls for /api/scan, over plain fetch (no SDK deps).
// Provider is chosen from env: SCAN_AI_PROVIDER (openai|anthropic) if set, else
// whichever API key is present.
//
// Two passes: (1) classify the page type, (2) read the empty slots scoped to it.
// Splitting them makes the album's confusable foil pages reliable. The route
// validates codes against the manifest afterwards.

import {
  CLASSIFY_SYSTEM,
  buildClassifyPrompt,
  READ_SYSTEM,
  buildReadPrompt,
} from "./prompt";
import type { PageType } from "./sections";

export interface VisionReading {
  pageType: PageType; // pass 1
  trophyPhoto: boolean; // pass 1 (diagnostic)
  teamCode: string; // pass 2, "" on non-team pages
  missing: string[]; // pass 2, raw empty codes (validated by the route)
}

export interface VisionResult {
  reading: VisionReading;
  model: string;
  warnings: string[];
}

interface VisionInput {
  image_base64: string;
  mime: string;
  hint?: string;
}

/** Server is misconfigured (no key, bad provider) -> HTTP 500. */
export class ConfigError extends Error {}
/** The upstream model call failed or returned junk -> HTTP 502. */
export class VisionError extends Error {}

type Provider = "openai" | "anthropic";

const TIMEOUT_MS = 55_000;
const MAX_TOKENS = 1024;
const PAGE_TYPES: readonly PageType[] = [
  "team",
  "opening",
  "cities",
  "history-early",
  "history-recent",
  "cc-lam",
];

const CLASSIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    page: { type: "string", enum: PAGE_TYPES },
    trophy_photo: { type: "boolean" },
    note: { type: "string" },
  },
  required: ["page", "trophy_photo", "note"],
} as const;

const READ_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    team_code: { type: "string" },
    missing: { type: "array", items: { type: "string" } },
  },
  required: ["team_code", "missing"],
} as const;

function selectProvider(): Provider {
  const forced = process.env.SCAN_AI_PROVIDER?.toLowerCase().trim();
  if (forced === "openai" || forced === "anthropic") return forced;
  if (forced) {
    throw new ConfigError(
      `SCAN_AI_PROVIDER="${forced}" is invalid (use "openai" or "anthropic")`,
    );
  }
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  throw new ConfigError(
    "No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.local.",
  );
}

/** Run both passes for one image. */
export async function runScan(input: VisionInput): Promise<VisionResult> {
  const cls = await classifyPage(input);
  const read = await readPage(input, cls.pageType);
  return {
    reading: {
      pageType: cls.pageType,
      trophyPhoto: cls.trophyPhoto,
      teamCode: read.teamCode,
      missing: read.missing,
    },
    model: read.model || cls.model,
    warnings: [],
  };
}

async function classifyPage(input: VisionInput) {
  const { obj, model } = await chat({
    system: CLASSIFY_SYSTEM,
    prompt: buildClassifyPrompt(),
    input,
    schema: CLASSIFY_SCHEMA,
    schemaName: "page_class",
  });
  const o = obj as { page?: unknown; trophy_photo?: unknown };
  const pageType = PAGE_TYPES.find((p) => p === o.page);
  if (!pageType) throw new VisionError(`Classifier returned unknown page "${String(o.page)}"`);
  return { pageType, trophyPhoto: o.trophy_photo === true, model };
}

async function readPage(input: VisionInput, pageType: PageType) {
  const { obj, model } = await chat({
    system: READ_SYSTEM,
    prompt: buildReadPrompt(pageType),
    input,
    schema: READ_SCHEMA,
    schemaName: "page_read",
  });
  const o = obj as { team_code?: unknown; missing?: unknown };
  return {
    teamCode: typeof o.team_code === "string" ? o.team_code.trim() : "",
    missing: toStringArray(o.missing),
    model,
  };
}

interface ChatArgs {
  system: string;
  prompt: string;
  input: VisionInput;
  schema: object;
  schemaName: string;
}

async function chat(args: ChatArgs): Promise<{ obj: unknown; model: string }> {
  return selectProvider() === "openai" ? chatOpenAI(args) : chatAnthropic(args);
}

async function chatOpenAI(args: ChatArgs): Promise<{ obj: unknown; model: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new ConfigError("OPENAI_API_KEY is not set");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";
  const base = process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";

  const data = (await postJSON(
    `${base}/chat/completions`,
    { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    {
      model,
      // gpt-5.x require max_completion_tokens and reject a non-default temperature.
      max_completion_tokens: MAX_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: { name: args.schemaName, strict: true, schema: args.schema },
      },
      messages: [
        { role: "system", content: args.system },
        {
          role: "user",
          content: [
            { type: "text", text: args.prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${args.input.mime};base64,${args.input.image_base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    },
    "OpenAI",
  )) as { model?: string; choices?: { message?: { content?: string } }[] };

  return { obj: parseJson(data.choices?.[0]?.message?.content), model: data.model ?? model };
}

async function chatAnthropic(args: ChatArgs): Promise<{ obj: unknown; model: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new ConfigError("ANTHROPIC_API_KEY is not set");
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
  const base = process.env.ANTHROPIC_BASE_URL?.trim() || "https://api.anthropic.com";

  const data = (await postJSON(
    `${base}/v1/messages`,
    {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    {
      model,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: args.system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: args.input.mime, data: args.input.image_base64 },
            },
            { type: "text", text: args.prompt },
          ],
        },
      ],
    },
    "Anthropic",
  )) as { model?: string; content?: { text?: string }[] };

  return { obj: parseJson(data.content?.[0]?.text), model: data.model ?? model };
}

async function postJSON(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  label: string,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new VisionError(`${label} request failed: ${reason}`);
  }
  if (!res.ok) {
    throw new VisionError(`${label} returned ${res.status}: ${await safeText(res)}`);
  }
  try {
    return await res.json();
  } catch {
    throw new VisionError(`${label} returned non-JSON response`);
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "(no body)";
  }
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter((x) => x !== "");
}

/** Parse the model's JSON answer tolerantly (handles ```json fences / stray prose). */
function parseJson(content: unknown): unknown {
  if (typeof content !== "string" || content.trim() === "") {
    throw new VisionError("Model returned an empty response");
  }
  try {
    return JSON.parse(content);
  } catch {
    // fall through to brace extraction
  }
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(content.slice(start, end + 1));
    } catch {
      // fall through
    }
  }
  throw new VisionError("Could not parse JSON from model response");
}
