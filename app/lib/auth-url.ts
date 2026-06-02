import { getSiteUrl } from "./site-seo";

/** Path for Supabase OAuth return — use /api/auth/callback (reliable on Vercel). */
export const AUTH_CALLBACK_PATH = "/api/auth/callback";

/** OAuth return URL — must match Supabase Auth → Redirect URLs exactly. */
export function getAuthCallbackUrl(next = "/dashboard"): string {
  const base =
    typeof window !== "undefined" && !process.env.NEXT_PUBLIC_SITE_URL?.trim()
      ? window.location.origin.replace(/\/$/, "")
      : getSiteUrl();
  const path = next.startsWith("/") ? next : `/${next}`;
  return `${base}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(path)}`;
}
