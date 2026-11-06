import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

let admin: SupabaseClient | null = null;
let anon: SupabaseClient | null = null;

/** Service-role client. Server-only: bypasses RLS. Never import from a client component. */
export function adminDb(): SupabaseClient {
  const url = env.supabaseUrl();
  const key = env.supabaseServiceKey();
  if (!url || !key) throw new Error("Supabase service role is not configured (SUPABASE_SERVICE_ROLE_KEY)");
  admin ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/** Anon client for public reads (RLS applies). Returns null if Supabase isn't configured yet. */
export function publicDb(): SupabaseClient | null {
  const url = env.supabaseUrl();
  const key = env.supabaseAnonKey();
  if (!url || !key) return null;
  anon ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return anon;
}
