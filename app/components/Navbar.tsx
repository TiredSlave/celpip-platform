"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

const PRACTICE_MENU = [
  {
    section: "✍️ Writing",
    sectionHome: "/practice/writing",
    items: [
      { label: "Task 1 — Write an Email", href: "/practice/writing?filter=Writing Task 1" },
      { label: "Task 2 — Respond to Survey", href: "/practice/writing?filter=Writing Task 2" },
    ],
  },
  {
    section: "📖 Reading",
    sectionHome: "/practice/reading",
    items: [
      { label: "Part 1 — Correspondence", href: "/practice/reading?filter=Reading Correspondence" },
      { label: "Part 2 — Apply Information", href: "/practice/reading?filter=Reading to Apply Information" },
      { label: "Part 3 — Information", href: "/practice/reading?filter=Reading for Information" },
      { label: "Part 4 — Viewpoints", href: "/practice/reading?filter=Reading for Viewpoints" },
    ],
  },
  {
    section: "🎤 Speaking",
    sectionHome: "/practice/speaking",
    items: [
      { label: "Task 1 — Give Advice", href: "/practice/speaking?filter=Speaking Task 1" },
      { label: "Task 2 — Personal Experience", href: "/practice/speaking?filter=Speaking Task 2" },
      { label: "Task 3 — Describe a Picture", href: "/practice/speaking?filter=Speaking Task 3" },
      { label: "Task 4 — Make Predictions", href: "/practice/speaking?filter=Speaking Task 4" },
      { label: "Task 5 — Compare Pictures", href: "/practice/speaking?filter=Speaking Task 5" },
      { label: "Task 6 — Deal with a Situation", href: "/practice/speaking?filter=Speaking Task 6" },
      { label: "Task 7 — Express Opinion", href: "/practice/speaking?filter=Speaking Task 7" },
      { label: "Task 8 — Unusual Situation", href: "/practice/speaking?filter=Speaking Task 8" },
    ],
  },
  {
    section: "🎧 Listening",
    sectionHome: "/practice/listening",
    items: [
      { label: "Part 1 — Problem Solving", href: "/practice/listening?filter=Listening - Problem Solving" },
      { label: "Part 2 — Daily Life", href: "/practice/listening?filter=Listening - Daily Life Conversation" },
      { label: "Part 3 — Information", href: "/practice/listening?filter=Listening - Listening for Information" },
      { label: "Part 4 — News Item", href: "/practice/listening?filter=Listening - News Item" },
      { label: "Part 5 — Discussion", href: "/practice/listening?filter=Listening - Discussion" },
      { label: "Part 6 — Viewpoints", href: "/practice/listening?filter=Listening - Viewpoints" },
    ],
  },
];

const SECTION_COLORS: Record<string, { dot: string; text: string; activeBg: string; hover: string }> = {
  "✍️ Writing":  { dot: "bg-blue-400",   text: "text-blue-700",   activeBg: "bg-blue-100",   hover: "hover:bg-blue-50"   },
  "📖 Reading":  { dot: "bg-green-400",  text: "text-green-700",  activeBg: "bg-green-100",  hover: "hover:bg-green-50"  },
  "🎤 Speaking": { dot: "bg-purple-400", text: "text-purple-700", activeBg: "bg-purple-100", hover: "hover:bg-purple-50" },
  "🎧 Listening":{ dot: "bg-orange-400", text: "text-orange-700", activeBg: "bg-orange-100", hover: "hover:bg-orange-50" },
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("✍️ Writing");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPracticeOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, []);

  /** When opening the menu, match the highlighted section to the current practice route */
  useEffect(() => {
    if (!practiceOpen || !pathname) return;
    const match = PRACTICE_MENU.find(m => pathname.startsWith(m.sectionHome));
    if (match) setActiveSection(match.section);
  }, [practiceOpen, pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isPracticeActive = ["/practice/writing/task", "/practice/reading/task", "/practice/speaking/task", "/practice/listening/task"].some(p => pathname?.startsWith(p));
  const colors = SECTION_COLORS[activeSection];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">C</div>
          <span className="font-bold text-gray-800 text-lg">CELPIP Practice</span>
        </Link>

        {/* Nav Items */}
        <div className="flex items-center gap-1">

          {/* Practice Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setPracticeOpen(o => !o)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                practiceOpen || isPracticeActive ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Practice
              <svg className={`w-4 h-4 transition-transform ${practiceOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Mega Dropdown */}
            {practiceOpen && (
              <div className="absolute top-full left-0 mt-2 w-[640px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="flex">

                  {/* Left — Section tabs (opens that skill’s task list) */}
                  <div className="w-48 bg-gray-50 border-r border-gray-100 p-3 space-y-1">
                    {PRACTICE_MENU.map(s => {
                      const c = SECTION_COLORS[s.section];
                      return (
                        <button
                          key={s.section}
                          type="button"
                          onClick={() => {
                            setActiveSection(s.section);
                            setPracticeOpen(false);
                            router.push(s.sectionHome);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition ${
                            activeSection === s.section ? `${c.activeBg} ${c.text}` : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {s.section}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right — Task list */}
                  <div className="flex-1 p-4">
                    <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${colors.text}`}>
                      Select a task
                    </p>
                    <div className="space-y-1">
                      {PRACTICE_MENU.find(s => s.section === activeSection)?.items.map(item => (
                        <Link
                          key={item.label + item.href}
                          href={item.href}
                          onClick={() => setPracticeOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 transition ${colors.hover}`}
                        >
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex items-center justify-between">
                  <p className="text-xs text-gray-400">Select a section and task to begin practicing</p>
                  <Link href="/practice" onClick={() => setPracticeOpen(false)}
                    className="text-xs text-blue-600 font-semibold hover:underline">
                    View all →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Other nav items */}
          {[
            { label: "Mock Test", href: "/mock-test" },
            { label: "Templates", href: "/templates" },
            { label: "Vocabulary", href: "/vocabulary" },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                pathname?.startsWith(item.href) ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-800 font-medium transition">
                Dashboard
              </Link>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {user.email?.[0]?.toUpperCase()}
              </div>
              <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-500 transition">
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition">
                Login
              </Link>
              <Link href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
                Sign up free
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
