"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type AuthUser = {
  id: string;
  email?: string | null;
};

type Profile = {
  full_name?: string | null;
  target_band?: number | null;
  test_date?: string | null;
  user_type?: string | null;
  premium_expires_at?: string | null;
  is_admin?: boolean | null;
};

function isPremium(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.user_type === "premium") return true;
  if (profile.premium_expires_at) {
    return new Date(profile.premium_expires_at) > new Date();
  }
  return false;
}

function daysUntilTest(testDate: string | null | undefined): number | null {
  if (!testDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const test = new Date(testDate);
  test.setHours(0, 0, 0, 0);
  return Math.ceil((test.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function displayName(user: AuthUser, profile: Profile | null): string {
  if (profile?.full_name?.trim()) return profile.full_name.trim();
  const local = user.email?.split("@")[0];
  return local || "User";
}

function initials(user: AuthUser, profile: Profile | null): string {
  const name = displayName(user, profile);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name[0] || user.email?.[0] || "U").toUpperCase();
}

type MenuLink = {
  href: string;
  label: string;
  icon: string;
  description?: string;
};

const LEARNING_LINKS: MenuLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", description: "Scores & progress" },
  { href: "/profile", label: "Profile & goals", icon: "🎯", description: "Target band & test date" },
  { href: "/account/mock-history", label: "Mock test history", icon: "📝", description: "Continue or review mocks" },
  { href: "/vocabulary", label: "My vocabulary", icon: "📚", description: "Saved words & phrases" },
];

export default function UserMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [practiceCount, setPracticeCount] = useState<number | null>(null);
  const [mockCount, setMockCount] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "X-User-Id": session.user.id,
        },
      });
      const data = await res.json();
      if (data && !data.error) setProfile(data);
    } catch {
      /* ignore */
    }
  }, []);

  const loadQuickStats = useCallback(async () => {
    const [{ count: practice }, { count: mocks }] = await Promise.all([
      supabase.from("attempts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("mock_test_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);
    setPracticeCount(practice ?? 0);
    setMockCount(mocks ?? 0);
  }, [user.id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile, user.id]);

  useEffect(() => {
    if (!open) return;
    void loadQuickStats();
  }, [open, loadQuickStats]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
  }

  const premium = isPremium(profile);
  const daysLeft = daysUntilTest(profile?.test_date);
  const targetBand = profile?.target_band ?? null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full p-0.5 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Open user menu"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-base font-bold shrink-0 shadow-sm">
          {initials(user, profile)}
        </div>
        <svg
          className={`w-5 h-5 text-gray-600 hidden sm:block transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[60]"
          role="menu"
        >
          <div className="px-4 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                {initials(user, profile)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 truncate">{displayName(user, profile)}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      premium ? "bg-yellow-100 text-yellow-800" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {premium ? "Premium" : "Free"}
                  </span>
                  {targetBand != null && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-100">
                      Target {targetBand}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {(targetBand != null || daysLeft !== null) && (
              <p className="text-xs text-gray-600 mt-3">
                {targetBand != null && <span>Goal: Band {targetBand}</span>}
                {targetBand != null && daysLeft !== null && <span> · </span>}
                {daysLeft !== null && (
                  <span>
                    {daysLeft < 0
                      ? "Test date passed"
                      : daysLeft === 0
                        ? "Test is today"
                        : `${daysLeft} day${daysLeft === 1 ? "" : "s"} until test`}
                  </span>
                )}
              </p>
            )}
            {(practiceCount !== null || mockCount !== null) && (
              <p className="text-xs text-gray-500 mt-2">
                {practiceCount !== null && <span>{practiceCount} practice sessions</span>}
                {practiceCount !== null && mockCount !== null && <span> · </span>}
                {mockCount !== null && <span>{mockCount} mock attempt{mockCount === 1 ? "" : "s"}</span>}
              </p>
            )}
          </div>

          <div className="py-2">
            <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Learning</p>
            {LEARNING_LINKS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition"
              >
                <span className="text-lg leading-none mt-0.5" aria-hidden>
                  {item.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-800">{item.label}</span>
                  {item.description && (
                    <span className="block text-xs text-gray-500">{item.description}</span>
                  )}
                </span>
              </Link>
            ))}
          </div>

          <div className="border-t border-gray-100 py-2">
            <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Account</p>
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-sm font-semibold text-gray-800"
            >
              <span aria-hidden>⚙️</span>
              Account settings
            </Link>
            {!premium && (
              <Link
                href="/dashboard"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition text-sm font-semibold text-amber-800"
              >
                <span aria-hidden>⭐</span>
                Upgrade to Premium
              </Link>
            )}
          </div>

          {profile?.is_admin && (
            <div className="border-t border-gray-100 py-2">
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-sm font-semibold text-gray-800"
              >
                <span aria-hidden>🛠</span>
                Admin panel
              </Link>
            </div>
          )}

          <div className="border-t border-gray-100 p-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleLogout()}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition text-left"
            >
              <span aria-hidden>🚪</span>
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
