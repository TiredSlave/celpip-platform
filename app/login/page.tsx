"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthAlert,
  AuthDivider,
  AuthField,
  AuthShell,
  authInputClassName,
  authPrimaryButtonClassName,
} from "../components/AuthShell";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { supabase } from "../lib/supabase";
import { SITE_NAME } from "../lib/brand";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmed = searchParams.get("confirmed");
  const oauthFailed = searchParams.get("error") === "oauth_failed";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle={`Sign in to continue your ${SITE_NAME} practice.`}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      {confirmed && (
        <AuthAlert tone="success">Email confirmed. You can sign in now.</AuthAlert>
      )}

      {oauthFailed && (
        <AuthAlert tone="error">
          Google sign-in failed. Check your Supabase Auth settings and try again.
        </AuthAlert>
      )}

      <GoogleSignInButton disabled={loading} />

      <AuthDivider label="or use email" />

      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <AuthField label="Email" id="login-email">
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className={authInputClassName}
        />
      </AuthField>

      <AuthField label="Password" id="login-password">
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className={authInputClassName}
        />
      </AuthField>

      <div className="mb-6 text-right">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-slate-600 transition hover:text-blue-600"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading || !email || !password}
        className={authPrimaryButtonClassName}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
          Loading...
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
