import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "./env";

export async function supabaseServer() {
  const store = await cookies();
  const url = env.supabaseUrl();
  const key = env.supabaseAnonKey();
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a server component — middleware refreshes the session */
        }
      },
    },
  });
}

/** Defence in depth: every admin page and admin API call re-checks the allowlist server-side. */
export async function currentAdmin(): Promise<string | null> {
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  return email && env.adminEmails().includes(email) ? email : null;
}
