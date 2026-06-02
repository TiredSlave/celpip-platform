"use client";

import Link from "next/link";
import { useState } from "react";
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

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSignup() {
    setLoading(true);
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }
    try {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) setError(signUpError.message);
      else setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="We sent a confirmation link to activate your account."
        footer={
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16v10H4V7Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
              <path
                d="m4 7 8 6 8-6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            Open the link we sent to{" "}
            <span className="font-semibold text-slate-900">{email}</span> to finish setting up
            your account.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start practicing with a free account in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleSignInButton disabled={loading} />

      <AuthDivider label="or use email" />

      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <AuthField label="Email" id="signup-email">
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className={authInputClassName}
        />
      </AuthField>

      <AuthField label="Password" id="signup-password">
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          className={authInputClassName}
        />
      </AuthField>

      <AuthField label="Confirm password" id="signup-confirm-password">
        <input
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          className={authInputClassName}
        />
      </AuthField>

      <button
        type="button"
        onClick={handleSignup}
        disabled={loading || !email || !password || !confirmPassword}
        className={`${authPrimaryButtonClassName} mt-2`}
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
        By creating an account, you agree to use the platform for personal CELPIP practice.
      </p>
    </AuthShell>
  );
}
