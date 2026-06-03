import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthedSupabase } from "./mock-test-auth";

export const SERVICE_ROLE_SETUP_MSG =
  "Set SUPABASE_SERVICE_ROLE_KEY to the service_role secret from Supabase → Settings → API (not the anon/public key). On Vercel: Environment Variables → Production, then Redeploy.";

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/** Read role claim from a Supabase API key JWT (anon | service_role). */
export function decodeSupabaseKeyRole(key: string): string | null {
  const parts = key.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = JSON.parse(
      typeof Buffer !== "undefined" ?
        Buffer.from(padded, "base64").toString("utf8")
      : atob(padded),
    ) as { role?: string };
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

/** True only when env key is the real service_role JWT (anon key pasted here returns false). */
export function hasValidServiceRoleKey(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(key && decodeSupabaseKeyRole(key) === "service_role");
}

/** Service-role client — bypasses RLS. Returns null if key missing or anon key was pasted by mistake. */
export function createServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key || decodeSupabaseKeyRole(key) !== "service_role") return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Admin mutations after requireAdmin() — must use service role (not user JWT, not anon). */
export function requireServiceRoleDb(): SupabaseClient | Response {
  const db = createServiceRoleClient();
  if (!db) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    let detail = SERVICE_ROLE_SETUP_MSG;
    if (key && decodeSupabaseKeyRole(key) === "anon") {
      detail =
        "SUPABASE_SERVICE_ROLE_KEY is the anon key. Replace it with the service_role secret from Supabase → Settings → API, then redeploy.";
    } else if (!key) {
      detail = "SUPABASE_SERVICE_ROLE_KEY is not set on the server. " + SERVICE_ROLE_SETUP_MSG;
    }
    return Response.json({ error: detail }, { status: 503 });
  }
  return db;
}

/**
 * DB client for routes that already passed requireAdmin().
 * Uses service role when valid; otherwise signed-in admin JWT (RLS).
 */
export function getAdminDataClient(authed: AuthedSupabase): SupabaseClient {
  const service = createServiceRoleClient();
  if (service) return service;
  return authed.supabase;
}

/** Server-side Supabase client (service role when valid, else anon for public reads). */
export function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const service = createServiceRoleClient();
  if (service) return service;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  return createClient(url, key);
}
