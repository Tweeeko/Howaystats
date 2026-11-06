import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminToken } from "./admin-session";

/** Defence in depth: every admin page and admin API call re-checks the signed cookie server-side. */
export async function currentAdmin(): Promise<string | null> {
  const store = await cookies();
  const ok = await verifyAdminToken(store.get(ADMIN_COOKIE)?.value, process.env.ADMIN_PASSWORD);
  return ok ? "admin" : null;
}
