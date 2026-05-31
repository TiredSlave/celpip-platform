"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MockTestSkill } from "../lib/mock-test-types";

type MockTestListItem = {
  id: string;
  title: string;
  description: string | null;
  test_type: string | null;
  time_limit_minutes: number;
  mock_test_tasks: { count: number }[];
};

const SKILL_META: Record<
  MockTestSkill,
  { icon: string; border: string; badge: string; btn: string }
> = {
  Reading: {
    icon: "📖",
    border: "border-green-200 hover:border-green-400",
    badge: "bg-green-100 text-green-800",
    btn: "text-green-700",
  },
  Writing: {
    icon: "✍️",
    border: "border-blue-200 hover:border-blue-400",
    badge: "bg-blue-100 text-blue-800",
    btn: "text-blue-700",
  },
  Speaking: {
    icon: "🎤",
    border: "border-purple-200 hover:border-purple-400",
    badge: "bg-purple-100 text-purple-800",
    btn: "text-purple-700",
  },
  Listening: {
    icon: "🎧",
    border: "border-orange-200 hover:border-orange-400",
    badge: "bg-orange-100 text-orange-800",
    btn: "text-orange-700",
  },
};

export default function MockTestListPage() {
  const [tests, setTests] = useState<MockTestListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mock-tests")
      .then(r => r.json())
      .then(json => setTests(json.tests || []))
      .finally(() => setLoading(false));
  }, []);

  const grouped = tests.reduce<Record<string, MockTestListItem[]>>((acc, t) => {
    const key = t.test_type || "Other";
    acc[key] = acc[key] || [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mock Tests</h1>
          <p className="text-gray-600 max-w-2xl">
            Timed practice sets built from the task library. Finish every part, review your answers, then submit once
            at the end.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-600">
            <p className="text-4xl mb-3">📋</p>
            <p>No published mock tests yet.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([skill, items]) => {
            const meta = SKILL_META[skill as MockTestSkill] || {
              icon: "📋",
              border: "border-gray-200",
              badge: "bg-gray-100 text-gray-800",
              btn: "text-gray-700",
            };
            return (
              <section key={skill} className="mb-10">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>{meta.icon}</span> {skill}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {items.map(test => (
                    <Link
                      key={test.id}
                      href={`/mock-test/${test.id}`}
                      className={`block bg-white rounded-xl shadow-sm border-2 p-5 transition ${meta.border}`}
                    >
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${meta.badge}`}>{skill}</span>
                      <h3 className="font-bold text-gray-900 mt-2">{test.title}</h3>
                      {test.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{test.description}</p>
                      )}
                      <p className={`text-xs font-medium mt-3 ${meta.btn}`}>
                        {test.mock_test_tasks?.[0]?.count ?? "—"} parts · ~{test.time_limit_minutes} min
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })
        )}

        <Link href="/practice" className="inline-block mt-4 text-indigo-700 font-medium hover:underline">
          ← Back to practice hub
        </Link>
      </div>
    </div>
  );
}
