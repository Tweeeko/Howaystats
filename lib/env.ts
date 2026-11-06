/** Central access to environment configuration. Server-only values never use the NEXT_PUBLIC_ prefix. */
const get = (k: string) => {
  const v = process.env[k];
  return v && v.trim() !== "" ? v.trim() : undefined;
};

export const env = {
  siteUrl: () => get("NEXT_PUBLIC_SITE_URL") ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  supabaseUrl: () => get("NEXT_PUBLIC_SUPABASE_URL") ?? get("SUPABASE_URL"),
  supabaseAnonKey: () => get("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? get("SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => get("SUPABASE_SERVICE_ROLE_KEY"),
  footballApiKey: () => get("FOOTBALL_API_KEY"),
  footballProvider: () => get("FOOTBALL_API_PROVIDER") ?? "football-data",
  seasonOverride: () => (get("FOOTBALL_SEASON") ? Number(get("FOOTBALL_SEASON")) : undefined),
  newsApiKey: () => get("NEWS_API_KEY"),
  aiApiKey: () => get("AI_API_KEY"),
  aiProvider: () => (get("AI_PROVIDER") ?? "gemini").toLowerCase(),
  aiModel: () => get("AI_MODEL"),
  aiBaseUrl: () => get("AI_BASE_URL"),
  cronSecret: () => get("CRON_SECRET"),
  giphyKey: () => get("GIPHY_API_KEY") ?? get("MEME_SOURCE_API_KEY"),
  adminPassword: () => get("ADMIN_PASSWORD"),
  redditClientId: () => get("REDDIT_CLIENT_ID"),
  redditClientSecret: () => get("REDDIT_CLIENT_SECRET"),
  adminEmails: () => (get("ADMIN_EMAIL") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  simulations: () => Number(get("SIMULATIONS") ?? 50_000),
};

export const isSupabaseConfigured = () => !!(env.supabaseUrl() && env.supabaseAnonKey());
