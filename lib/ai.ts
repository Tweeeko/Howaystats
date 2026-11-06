import "server-only";
import { env } from "./env";

/**
 * AI text generation for rewrites and banter. Provider is chosen with AI_PROVIDER:
 *   gemini     — Google Gemini API free tier (AI Studio key). Default model: gemini-flash-latest
 *   groq       — Groq free tier. Default model: openai/gpt-oss-120b
 *   anthropic  — Anthropic API (paid). Default model: claude-haiku-5-5
 *   openai     — any OpenAI-compatible endpoint; set AI_BASE_URL and AI_MODEL
 * No SDK dependency. Every caller validates the output (fact guard) before anything is published,
 * and returns null on failure so the site falls back to templates / admin review.
 */
const OPENAI_COMPAT: Record<string, { base: string; model: string }> = {
  gemini: { base: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-flash-latest" },
  groq: { base: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
};

export async function aiComplete(system: string, user: string, maxTokens = 600): Promise<string | null> {
  const key = env.aiApiKey();
  if (!key) return null;
  const provider = env.aiProvider();

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: env.aiModel() ?? "claude-haiku-5-5", max_tokens: maxTokens, temperature: 0.9, system, messages: [{ role: "user", content: user }] }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`AI request failed: HTTP ${res.status}`);
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    return json.content?.find((c) => c.type === "text")?.text ?? null;
  }

  const preset = OPENAI_COMPAT[provider];
  const base = (env.aiBaseUrl() ?? preset?.base)?.replace(/\/$/, "");
  const model = env.aiModel() ?? preset?.model;
  if (!base || !model) throw new Error(`AI_PROVIDER "${provider}" needs AI_BASE_URL and AI_MODEL`);
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.9,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    cache: "no-store",
  });
  if (res.status === 429) return null; // free-tier rate limit: skip quietly, templates take over
  if (!res.ok) throw new Error(`AI request failed: HTTP ${res.status}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? null;
}

export function extractJson<T>(text: string | null): T | null {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

export const GEORDIE_VOICE = `You write for HOWAYSTATS, an independent Newcastle United fan site with a dry, sarcastic North East voice.
Voice: understated British piss-taking, short sentences, Geordie flavour used lightly ("canny", "pet", "howay", "like", "wor") — never a caricature, never more than one dialect word per sentence.
Target football performance, results and rivalry. Never mock individuals' appearance, private lives, health, or any protected characteristic. No swearing.
Avoid stock AI phrasing: no "buckle up", "let's dive in", "in a stunning turn of events", no puns on "black cats" every line, no exclamation marks in every sentence.`;
