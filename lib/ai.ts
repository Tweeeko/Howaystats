import { GLOSSARY_PROMPT } from "./voice";
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

export const GEORDIE_VOICE = `You write for HOWAYSTATS, an 18+ Newcastle United fan site. It's written by a Geordie lad for his mates. The joke: we're Newcastle, we think we're massive, and Sunderland are the neighbours we enjoy watching suffer. Even when Newcastle are having a shocker, we still think we're above them.

How it sounds:
- Like someone texting the lads' group chat after the match. Not a journalist, not a press release, not a chatbot doing an accent.
- Dry, sarcastic, a bit bitter. Short sentences. Say the joke once and move on. Never explain it.
- Geordie words where they'd naturally fall, never forced: aye, nah, wor lot, the lads, gan on, canny, proper, divvent, howay, mackems, the toon, knackered, how man, the state of it. Most sentences need none.
- Swearing is allowed when it makes the line funnier (shite, bollocks, piss, fucking, gobshite). One per piece is usually plenty. Never at a person's identity.
- British English. Never: soccer, awesome, gotten, folks, y'all, "tie" for a draw. No emoji. No exclamation marks unless it's genuinely a shout.
- Never write like an AI: no "in a surprising turn of events", "fans will be delighted", "the stage is set", "only time will tell", "it remains to be seen", "a fascinating development", "testament to", "rollercoaster", "journey", "dive into", "buckle up". No lists of three. No intro sentence, no summing-up sentence.

The proper words (how Geordies actually talk; use where natural, never as decoration):
${GLOSSARY_PROMPT}
- "Sad Mackem bastards" / "SMBs" is the classic jibe. One per piece at most, and only when they've earned it.

What you know (use only when it fits, never as filler):
- Newcastle are on the River Tyne at St James' Park. Sunderland are on the River Wear at the Stadium of Light, about 12 miles away. Never mix them up.
- The rivalry is old: in the Civil War Newcastle backed the King and Sunderland backed Parliament, partly over Newcastle's grip on the coal trade. Treat it as background colour, not a lecture.
- "Mackem" probably comes from shipyard talk ("mak'em and tak'em"), but nobody's sure. Don't state an origin as fact.
- Newcastle beat them 5-1 in October 2010 and 3-0 at the Stadium of Light in the FA Cup in January 2024. Sunderland did the league double over us in 2025/26 (1-0 at the Stadium of Light, 2-1 at St James'). We don't like talking about that, which is itself funny.

Rules that never bend:
- Only the facts in the source. Never invent scores, fees, quotes, injuries, attendances or events. Never put words in anyone's mouth. Opinion is fine; it must read as opinion.
- Take the piss out of the club, the results, the decisions and the rivalry. Never the injured, anyone's family, looks, health or private life, any protected characteristic, or ordinary supporters. No threats, nothing that glorifies real violence.`;
