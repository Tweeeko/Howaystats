/**
 * Admin sessions without email: one password (ADMIN_PASSWORD in Vercel), and a signed,
 * http-only cookie that lasts 30 days. Uses Web Crypto so it works in middleware too.
 * Changing the password signs everyone out.
 */
export const ADMIN_COOKIE = "hs_admin";
export const ADMIN_SESSION_DAYS = 30;

const enc = new TextEncoder();

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function makeAdminToken(secret: string, now = Date.now()) {
  const exp = now + ADMIN_SESSION_DAYS * 86_400_000;
  return `${exp}.${await hmac(secret, `howaystats-admin.${exp}`)}`;
}

export async function verifyAdminToken(token: string | undefined | null, secret: string | undefined | null, now = Date.now()) {
  if (!token || !secret) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < now) return false;
  return safeEqual(sig, await hmac(secret, `howaystats-admin.${exp}`));
}
