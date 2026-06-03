import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client — stores PKCE verifier in cookies for OAuth callback. */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
