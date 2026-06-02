import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSiteUrl } from "./site-seo";

export const authCallbackDynamic = "force-dynamic" as const;
export const authCallbackRuntime = "nodejs" as const;

function redirectTarget(request: Request, path: string): string {
  const configured = getSiteUrl();
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (process.env.NODE_ENV === "development") {
    return `${origin}${path}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return `${configured}${path}`;
  }

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}${path}`;
  }
  return `${origin}${path}`;
}

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  return raw;
}

async function createAuthRouteClient(request: Request, redirectPath: string) {
  const cookieStore = await cookies();
  let response = NextResponse.redirect(redirectTarget(request, redirectPath));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
          response = NextResponse.redirect(redirectTarget(request, redirectPath));
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  return { supabase, response: () => response };
}

/** Shared Supabase OAuth / email verification callback (used by /api/auth/callback and /auth/callback). */
export async function handleSupabaseAuthCallback(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");
  const next = safeNextPath(searchParams.get("next"));

  if (oauthError) {
    console.error("OAuth provider error:", oauthError, oauthErrorDescription);
    return NextResponse.redirect(redirectTarget(request, "/login?error=oauth_failed"));
  }

  if (code) {
    const { supabase, response } = await createAuthRouteClient(request, next);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response();
    }
    console.error("OAuth exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(redirectTarget(request, "/login?error=oauth_failed"));
  }

  if (token_hash && type) {
    const { supabase, response } = await createAuthRouteClient(
      request,
      "/login?confirmed=true",
    );
    const { error } = await supabase.auth.verifyOtp({
      type: type as "signup" | "email" | "recovery" | "invite" | "magiclink" | "email_change",
      token_hash,
    });

    if (!error) {
      return response();
    }

    console.error("Email verification error:", error.message);
    return NextResponse.redirect(redirectTarget(request, "/login?error=verification_failed"));
  }

  console.warn("Auth callback missing code and token_hash:", searchParams.toString());
  return NextResponse.redirect(redirectTarget(request, "/login?error=auth_callback_missing"));
}
