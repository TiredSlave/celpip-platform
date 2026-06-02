import { getSiteUrl } from "./site-seo";

/** OAuth return path — client page at app/auth/callback/page.tsx */
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** Reject accidental "url1 url2" paste from env or Supabase config. */
function normalizeOrigin(raw: string): string {
  const first = raw.trim().split(/\s+/)[0] ?? "";
  return first.replace(/\/$/, "");
}

/**
 * OAuth return URL — must match one row in Supabase → Redirect URLs exactly.
 * In the browser, always use the current site origin (celpiplib.com), not baked localhost.
 */
export function getAuthCallbackUrl(next = "/dashboard"): string {
  const base =
    typeof window !== "undefined"
      ? normalizeOrigin(window.location.origin)
      : normalizeOrigin(getSiteUrl());
  const path = next.startsWith("/") ? next : `/${next}`;
  return `${base}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(path)}`;
}
