"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { BrandLogo } from "../components/BrandLogo";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
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
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  async function handleOAuth(provider: "google" | "apple") {
    setOauthLoading(provider);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Check Your Email!</h2>
          <p className="text-gray-600 mb-6">
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account.
          </p>
          <a href="/login" className="text-blue-600 font-semibold hover:underline">
            Back to Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-md">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <BrandLogo size="lg" />
          <p className="text-gray-600 mt-4">Create your free account</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-lg p-3 mb-4 text-sm">
            ❌ {error}
          </div>
        )}

       
        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-600 font-medium">or sign up with email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email/Password Form */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <button
          onClick={handleSignup}
          disabled={loading || !email || !password || !confirmPassword}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "⏳ Creating account..." : "Create Account"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-600 font-medium">or continue with</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuth("google")}
            disabled={!!oauthLoading}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" width={20} height={20} />
            {oauthLoading === "google" ? "Connecting..." : "Continue with Google"}
          </button>

          <button
            onClick={() => handleOAuth("apple")}
            disabled={!!oauthLoading}
            className="w-full flex items-center justify-center gap-3 bg-black rounded-xl py-3 px-4 text-sm font-semibold text-white hover:bg-gray-900 transition disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.975 9.386c-.025-2.617 2.14-3.88 2.237-3.944-1.22-1.784-3.118-2.028-3.796-2.053-1.617-.163-3.16.952-3.98.952-.82 0-2.087-.928-3.43-.904-1.762.025-3.393 1.02-4.3 2.589-1.838 3.183-.472 7.907 1.322 10.497.876 1.264 1.921 2.685 3.294 2.634 1.32-.051 1.822-.853 3.42-.853 1.6 0 2.055.853 3.455.828 1.42-.025 2.322-1.29 3.188-2.558.999-1.466 1.413-2.886 1.438-2.96-.031-.014-2.76-1.058-2.848-4.228z"/>
              <path d="M12.327 2.267c.728-.882 1.22-2.104 1.086-3.327-1.05.043-2.317.7-3.07 1.582-.674.78-1.264 2.028-1.105 3.224 1.172.09 2.368-.594 3.089-1.479z"/>
            </svg>
            {oauthLoading === "apple" ? "Connecting..." : "Continue with Apple"}
          </button>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 font-semibold hover:underline">Login</a>
        </p>
      </div>
    </main>
  );
}
