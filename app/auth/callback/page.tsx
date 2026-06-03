"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { consumeAuthRedirectNext } from "../../lib/auth-url";
import { supabase } from "../../lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      const code = searchParams.get("code");
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const oauthError = searchParams.get("error");
      const next = consumeAuthRedirectNext(searchParams.get("next"));

      if (oauthError) {
        router.replace("/login?error=oauth_failed");
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          console.error("OAuth exchangeCodeForSession error:", error.message);
          router.replace("/login?error=oauth_failed");
          return;
        }
        router.replace(next);
        return;
      }

      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as
            | "signup"
            | "email"
            | "recovery"
            | "invite"
            | "magiclink"
            | "email_change",
          token_hash,
        });
        if (cancelled) return;
        if (error) {
          console.error("Email verification error:", error.message);
          router.replace("/login?error=verification_failed");
          return;
        }
        router.replace("/login?confirmed=true");
        return;
      }

      router.replace("/login?error=auth_callback_missing");
    }

    void finishAuth().catch((err) => {
      console.error("Auth callback error:", err);
      if (!cancelled) {
        setMessage("Sign-in failed. Redirecting…");
        router.replace("/login?error=oauth_failed");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <p className="text-slate-600">{message}</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-slate-600">Signing you in…</p>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
