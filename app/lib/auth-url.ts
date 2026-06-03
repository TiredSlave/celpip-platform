import { getSiteUrl } from "./site-seo";

/** OAuth return path — client page at app/auth/callback/page.tsx */
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** Post-OAuth destination stored before redirect (avoids query params on callback URL). */
export const AUTH_REDIRECT_NEXT_KEY = "celpip.auth.redirectNext";

/** Reject accidental "url1 url2" paste from env or Supabase config. */
function normalizeOrigin(raw: string): string {
  const first = raw.trim().split(/\s+/)[0] ?? "";
  return first.replace(/\/$/, "");
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isSafeRelativePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

/**
 * Origin used for OAuth redirectTo.
 * On local dev, always normalize to http://localhost:<port> so Supabase allowlist matches
 * even when the app is opened as 127.0.0.1 or [::1].
 */
export function getBrowserAuthOrigin(): string {
  if (typeof window === "undefined") {
    return normalizeOrigin(getSiteUrl());
  }

  const { hostname, port, origin } = window.location;
  if (isLocalHostname(hostname)) {
    const localPort = port || "3000";
    return `http://localhost:${localPort}`;
  }

  return normalizeOrigin(origin);
}

/** Remember where to send the user after OAuth completes. */
export function setAuthRedirectNext(next = "/dashboard"): void {
  if (typeof window === "undefined") return;
  const path = next.startsWith("/") ? next : `/${next}`;
  sessionStorage.setItem(AUTH_REDIRECT_NEXT_KEY, path);
}

/** Read and clear the post-OAuth destination. */
export function consumeAuthRedirectNext(queryNext?: string | null): string {
  const fallback = "/dashboard";

  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(AUTH_REDIRECT_NEXT_KEY);
    sessionStorage.removeItem(AUTH_REDIRECT_NEXT_KEY);
    if (stored && isSafeRelativePath(stored)) return stored;
  }

  if (queryNext && isSafeRelativePath(queryNext)) return queryNext;
  return fallback;
}

/**
 * OAuth return URL — must match one row in Supabase → Redirect URLs exactly.
 * Uses the current browser origin (not NEXT_PUBLIC_SITE_URL) so local sign-in stays local.
 */
export function getAuthCallbackUrl(): string {
  return `${getBrowserAuthOrigin()}${AUTH_CALLBACK_PATH}`;
}
