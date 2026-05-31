"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { READING_PARTS, readingPartFilterLabel } from "../lib/reading-task-types";
import UserMenu from "./UserMenu";
import { BrandLogo } from "./BrandLogo";

const PRACTICE_MENU = [
  {
    section: "Writing",
    sectionIcon: "✍️",
    sectionHome: "/practice/writing",
    items: [
      { label: "Task 1 — Write an Email", href: "/practice/writing?filter=Writing Task 1" },
      { label: "Task 2 — Respond to Survey", href: "/practice/writing?filter=Writing Task 2" },
    ],
  },
  {
    section: "Reading",
    sectionIcon: "📖",
    sectionHome: "/practice/reading",
    items: READING_PARTS.map(part => ({
      label: readingPartFilterLabel(part),
      href: `/practice/reading?filter=${encodeURIComponent(part.key)}`,
    })),
  },
  {
    section: "Speaking",
    sectionIcon: "🎤",
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
    section: "Listening",
    sectionIcon: "🎧",
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
  Writing: { dot: "bg-blue-500", text: "text-blue-800", activeBg: "bg-blue-100", hover: "hover:bg-blue-50" },
  Reading: { dot: "bg-green-500", text: "text-green-800", activeBg: "bg-green-100", hover: "hover:bg-green-50" },
  Speaking: { dot: "bg-purple-500", text: "text-purple-800", activeBg: "bg-purple-100", hover: "hover:bg-purple-50" },
  Listening: { dot: "bg-orange-500", text: "text-orange-800", activeBg: "bg-orange-100", hover: "hover:bg-orange-50" },
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("Writing");
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

  useEffect(() => {
    if (!practiceOpen || !pathname) return;
    const match = PRACTICE_MENU.find(m => pathname.startsWith(m.sectionHome));
    if (match) setActiveSection(match.section);
  }, [practiceOpen, pathname]);

  const isPracticeActive = ["/practice/writing/task", "/practice/reading/task", "/practice/speaking/task", "/practice/listening/task"].some(p =>
    pathname?.startsWith(p),
  );
  const colors = SECTION_COLORS[activeSection];

  const navLinkClass = (active: boolean) =>
    `px-4 py-2.5 rounded-xl text-[15px] font-semibold tracking-tight transition ${
      active ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 min-h-[4.25rem] py-3">
          {/* Logo */}
          <BrandLogo />

          {/* Nav */}
          <nav className="flex flex-wrap items-center justify-center gap-1 flex-1 order-3 lg:order-none w-full lg:w-auto basis-full lg:basis-auto">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setPracticeOpen(o => !o)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[15px] font-semibold tracking-tight transition ${
                  practiceOpen || isPracticeActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Practice
                <svg
                  className={`w-5 h-5 transition-transform ${practiceOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {practiceOpen && (
                <div className="absolute top-full left-0 mt-3 w-[min(680px,calc(100vw-2rem))] bg-white rounded-2xl shadow-xl border border-gray-200/80 overflow-hidden">
                  <div className="flex min-h-[280px]">
                    <div className="w-52 bg-slate-50 border-r border-gray-100 p-3 space-y-1">
                      {PRACTICE_MENU.map(s => {
                        const c = SECTION_COLORS[s.section];
                        const active = activeSection === s.section;
                        return (
                          <button
                            key={s.section}
                            type="button"
                            onClick={() => {
                              setActiveSection(s.section);
                              setPracticeOpen(false);
                              router.push(s.sectionHome);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl text-[15px] font-semibold transition flex items-center gap-2 ${
                              active ? `${c.activeBg} ${c.text}` : "text-gray-700 hover:bg-white"
                            }`}
                          >
                            <span aria-hidden>{s.sectionIcon}</span>
                            {s.section}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex-1 p-5">
                      <p className={`text-sm font-bold uppercase tracking-wide mb-4 ${colors.text}`}>
                        Select a task
                      </p>
                      <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                        {PRACTICE_MENU.find(s => s.section === activeSection)?.items.map(item => (
                          <Link
                            key={item.label + item.href}
                            href={item.href}
                            onClick={() => setPracticeOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] text-gray-800 font-medium transition ${colors.hover}`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 px-5 py-3.5 bg-slate-50 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Pick a skill, then choose a task to practice</p>
                    <Link
                      href="/practice"
                      onClick={() => setPracticeOpen(false)}
                      className="text-sm text-blue-700 font-semibold hover:underline"
                    >
                      View all →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {[
              { label: "Mock Test", href: "/mock-test" },
              { label: "Templates", href: "/templates" },
              { label: "Vocabulary", href: "/vocabulary" },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClass(Boolean(pathname?.startsWith(item.href)))}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user ? (
              <UserMenu user={{ id: user.id, email: user.email }} />
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2.5 text-[15px] font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-semibold rounded-xl shadow-sm shadow-blue-600/20 transition"
                >
                  Sign up free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
