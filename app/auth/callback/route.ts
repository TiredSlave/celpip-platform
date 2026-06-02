import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  // OAuth callback (Google)
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
    console.error("OAuth error:", error);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  console.log("Auth callback received:", { token_hash, type });

  if (token_hash && type) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash
    });

    if (!error) {
      console.log("Email verified successfully!");
      return NextResponse.redirect(
        new URL("/login?confirmed=true", request.url)
      );
    }

    console.error("Verification error:", error);
  }

  return NextResponse.redirect(new URL("/login", request.url));
}