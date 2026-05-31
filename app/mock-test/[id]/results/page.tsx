"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { aggregateMockScores, getPartResult } from "../../../lib/mock-test-results";
import { mockReviewUrl, mockTakeUrl } from "../../../lib/mock-test-runner";
import type { MockTestSkill } from "../../../lib/mock-test-types";

const SKILL_STYLE: Record<MockTestSkill, { badge: string; btn: string; text: string }> = {
  Reading: { badge: "bg-green-100 text-green-700", btn: "bg-green-600 hover:bg-green-700", text: "text-green-700" },
  Writing: { badge: "bg-blue-100 text-blue-700", btn: "bg-blue-600 hover:bg-blue-700", text: "text-blue-700" },
  Speaking: { badge: "bg-purple-100 text-purple-700", btn: "bg-purple-600 hover:bg-purple-700", text: "text-purple-700" },
  Listening: { badge: "bg-orange-100 text-orange-700", btn: "bg-orange-600 hover:bg-orange-700", text: "text-orange-700" },
};

type MockTask = {
  order_number: number;
  task_id: string;
  admin_tasks: { task_type: string; title: string | null };
};

function ResultsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mockId = params.id as string;
  const attemptId = searchParams.get("attempt");

  const [test, setTest] = useState<{ title: string; test_type: MockTestSkill } | null>(null);
  const [tasks, setTasks] = useState<MockTask[]>([]);
  const [attempt, setAttempt] = useState<{
    id: string;
    status: string;
    completed_orders: number[];
    task_results: Record<string, unknown>;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!attemptId) return;
    const testRes = await fetch(`/api/mock-tests/${mockId}`);
    if (testRes.ok) {
      const json = await testRes.json();
      setTest(json.test);
      setTasks(json.tasks || []);
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const attRes = await fetch(`/api/mock-tests/${mockId}/attempt?attempt_id=${attemptId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (attRes.ok) {
      const json = await attRes.json();
      setAttempt(json.attempt);
    }
  }, [attemptId, mockId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitMock() {
    if (!attemptId) return;
    setSubmitting(true);
    setMessage("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push(`/login?next=/mock-test/${mockId}/results?attempt=${attemptId}`);
      return;
    }
    const res = await fetch(`/api/mock-tests/${mockId}/attempt`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ attempt_id: attemptId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.error || "Could not submit.");
    } else {
      setAttempt(json.attempt);
      setMessage("Mock test submitted successfully.");
    }
    setSubmitting(false);
  }

  if (!attemptId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Missing attempt.</p>
      </div>
    );
  }

  const sorted = [...tasks].sort((a, b) => a.order_number - b.order_number);
  const completed = new Set(attempt?.completed_orders || []);
  const allDone = sorted.length > 0 && sorted.every(t => completed.has(t.order_number));
  const isSubmitted = attempt?.status === "submitted";
  const agg = attempt?.task_results
    ? aggregateMockScores(attempt.task_results as Record<string, import("../../../lib/mock-test-results").MockPartResult>)
    : { score: 0, total: 0, parts: [] };
  const pct = agg.total > 0 ? Math.round((agg.score / agg.total) * 100) : 0;
  const style = test?.test_type ? SKILL_STYLE[test.test_type] : SKILL_STYLE.Reading;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/mock-test" className={`text-sm hover:underline ${style.text}`}>
          ← All mock tests
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">{test?.title || "Mock test"}</h1>
        {test?.test_type && (
          <span className={`inline-block mt-2 text-xs font-bold px-2 py-1 rounded ${style.badge}`}>
            {test.test_type}
          </span>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mt-8 text-center">
          <p className="text-sm text-gray-600 uppercase tracking-wide mb-2">Overall</p>
          <p className="text-5xl font-bold text-gray-900">
            {agg.score}
            <span className="text-2xl text-gray-600">/{agg.total}</span>
          </p>
          <p className="text-xl font-semibold text-gray-600 mt-1">{pct}%</p>
          {isSubmitted && (
            <p className="text-sm text-green-700 font-medium mt-4">✓ Submitted</p>
          )}
        </div>

        <h2 className="text-lg font-bold text-gray-800 mt-10 mb-4">Review your answers</h2>
        <p className="text-sm text-gray-600 mb-4">
          Open any part to confirm your responses before final submit.
        </p>

        <div className="space-y-3">
          {sorted.map(mt => {
            const done = completed.has(mt.order_number);
            const part = getPartResult(
              attempt?.task_results as Record<string, import("../../../lib/mock-test-results").MockPartResult>,
              mt.order_number,
            );
            const partScore = part && typeof part.score === "number" ? `${part.score}/${part.total ?? "—"}` : "—";
            return (
              <div
                key={mt.order_number}
                className="bg-white rounded-xl shadow p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs text-gray-600">Part {mt.order_number}</p>
                  <p className="font-medium text-gray-900">{mt.admin_tasks?.task_type}</p>
                  <p className="text-xs text-gray-600">{mt.admin_tasks?.title || "Untitled"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">{partScore}</span>
                  {done ? (
                    <Link
                      href={mockReviewUrl(mockId, attemptId, mt.order_number)}
                      className={`text-sm font-semibold text-white px-3 py-2 rounded-lg ${style.btn}`}
                    >
                      Review
                    </Link>
                  ) : (
                    <Link
                      href={mockTakeUrl(mockId, mt.order_number)}
                      className="text-sm font-semibold text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-50"
                    >
                      Complete
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {message && (
          <p
            className={`mt-6 text-sm ${message.includes("success") ? "text-green-700" : "text-red-700"}`}
          >
            {message}
          </p>
        )}

        <div className="mt-10 border-t border-gray-200 pt-6">
          {isSubmitted ? (
            <Link href="/mock-test" className={`inline-block font-semibold ${style.text} hover:underline`}>
              Back to mock tests
            </Link>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                {allDone
                  ? "All parts are done. Submit when you have reviewed your answers."
                  : `Finish all ${sorted.length} parts before submitting.`}
              </p>
              <button
                type="button"
                disabled={!allDone || submitting}
                onClick={() => void submitMock()}
                className={`w-full sm:w-auto text-white font-semibold px-8 py-3 rounded-xl disabled:opacity-50 ${style.btn}`}
              >
                {submitting ? "Submitting…" : "Submit mock test"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MockTestResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600">Loading results…</p>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
