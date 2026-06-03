import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthedSupabase } from "./mock-test-auth";

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * DB client for routes that already passed requireAdmin().
 * Always uses the signed-in admin JWT so mock_tests RLS (profiles.is_admin) applies.
 * Set ADMIN_API_USE_SERVICE_ROLE=true only if you intentionally bypass RLS with the service role key.
 */
export function getAdminDataClient(authed: AuthedSupabase): SupabaseClient {
  if (process.env.ADMIN_API_USE_SERVICE_ROLE === "true" && hasServiceRoleKey()) {
    return createSupabaseAdmin();
  }
  return authed.supabase;
}

/** Server-side Supabase client (service role when set, else anon). */
export function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  return createClient(url, key);
}
