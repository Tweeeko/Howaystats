import "server-only";
import { publicDb } from "./client";

/** Public reads that should silently return nothing when Supabase isn't configured. */
export function adminDbOptional() {
  return publicDb();
}
