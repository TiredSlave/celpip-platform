"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { mockResultsUrl, mockTakeUrl } from "../../lib/mock-test-runner";
import type { MockTestSkill } from "../../lib/mock-test-types";

type AttemptRow = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  current_order: number;
  mock_test_id: string;
  mock_tests: {
    id: string;
    title: string;
    test_type: MockTestSkill | null;
  } | null;
};

const SKILL_BADGE: Record<string, string> = {
  Reading: "bg-green-100 text-green-800",
  Writing: "bg-blue-100 text-blue-800",
  Speaking: "bg-purple-100 text-purple-800",
  Listening: "bg-orange-100 text-orange-800",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MockHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login?next=/account/mock-history");
      return;
    }

    const { data, error: qErr } = await supabase
      .from("mock_test_attempts")
      .select(
        "id, status, created_at, updated_at, submitted_at, current_order, mock_test_id, mock_tests(id, title, test_type)",
      )
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });

    if (qErr) {
      setError(qErr.message);
      setRows([]);
    } else {
      const normalized = (data ?? []).map(row => ({
        ...row,
        mock_tests: Array.isArray(row.mock_tests) ? row.mock_tests[0] ?? null : row.mock_tests,
      }));
      setRows(normalized as AttemptRow[]);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/mock-test" className="text-sm text-indigo-600 hover:underline">
            ← Browse mock tests
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Mock test history</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Continue in-progress mocks or review submitted attempts.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <p className="text-gray-600 text-xs mb-4">
              If the table is missing, run the SQL in docs/supabase-mock-tests.sql.
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="text-indigo-600 font-semibold text-sm hover:underline"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center">
            <p className="text-gray-600 mb-4">You have not started any mock tests yet.</p>
            <Link
              href="/mock-test"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
            >
              Start a mock test
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map(row => {
              const mock = row.mock_tests;
              const skill = mock?.test_type || "Reading";
              const badge = SKILL_BADGE[skill] || "bg-gray-100 text-gray-700";
              const inProgress = row.status === "in_progress";
              const actionHref = inProgress
                ? mockTakeUrl(row.mock_test_id)
                : mockResultsUrl(row.mock_test_id, row.id);
              const actionLabel = inProgress ? "Continue" : "View results";

              return (
                <li
                  key={row.id}
                  className="bg-white rounded-xl shadow border border-gray-100 p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>
                        {skill}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          inProgress ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {inProgress ? "In progress" : "Submitted"}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">
                      {mock?.title || "Mock test"}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Updated {formatWhen(row.updated_at)}
                      {inProgress && (
                        <span> · Part {row.current_order}</span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={actionHref}
                    className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
                  >
                    {actionLabel}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
