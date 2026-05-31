"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import MockReadingPanel from "../../../components/mock-test/MockReadingPanel";
import MockWritingPanel from "../../../components/mock-test/MockWritingPanel";
import MockTestShell from "../../../components/mock-test/MockTestShell";
import { getPartResult } from "../../../lib/mock-test-results";
import { mockResultsUrl } from "../../../lib/mock-test-runner";
import type { MockTestSkill } from "../../../lib/mock-test-types";
import { partNumberFromRow, readingPartLabel } from "../../../lib/reading-task-types";

function ReviewContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const mockId = params.id as string;
  const attemptId = searchParams.get("attempt");
  const order = Number(searchParams.get("order") || "1");

  const [test, setTest] = useState<{ title: string; test_type: MockTestSkill } | null>(null);
  const [taskRow, setTaskRow] = useState<{
    task_id: string;
    admin_tasks: Record<string, unknown>;
  } | null>(null);
  const [saved, setSaved] = useState<ReturnType<typeof getPartResult>>(undefined);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!attemptId) return;
    const testRes = await fetch(`/api/mock-tests/${mockId}`);
    if (testRes.ok) {
      const json = await testRes.json();
      setTest(json.test);
      const slot = (json.tasks || []).find((t: { order_number: number }) => t.order_number === order);
      setTaskRow(slot || null);
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const attRes = await fetch(`/api/mock-tests/${mockId}/attempt?attempt_id=${attemptId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (attRes.ok) {
      const json = await attRes.json();
      setSaved(getPartResult(json.attempt?.task_results, order));
    }
    setLoading(false);
  }, [attemptId, mockId, order]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading review…</p>
      </div>
    );
  }

  if (!test || !taskRow || !saved) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">No saved answers for this part.</p>
        <Link href={mockResultsUrl(mockId, attemptId || "")} className="text-indigo-700 underline">
          Back to results
        </Link>
      </div>
    );
  }

  const adminTask = taskRow.admin_tasks as {
    id: string;
    task_type: string;
    content: Record<string, unknown>;
    section?: string | null;
    sequence_number?: number | null;
  };

  const partNum = partNumberFromRow(adminTask);
  const partTitle =
    test.test_type === "Reading" && partNum
      ? readingPartLabel(`task ${partNum}`)
      : adminTask.task_type;

  return (
    <MockTestShell
      skill={test.test_type}
      mockTitle={test.title}
      partLabel={`Part ${order} (review)`}
      partTitle={partTitle}
      order={order}
      totalParts={order}
      timeLeft={0}
      onNext={() => {}}
      nextLabel="—"
      nextDisabled
      backHref={mockResultsUrl(mockId, attemptId || "")}
    >
      <div className="shrink-0 bg-blue-50 border-b border-blue-200 px-6 py-2 text-sm text-blue-800 flex justify-between items-center">
        <span>
          Your score for this part:{" "}
          <strong>
            {saved.score ?? "—"}/{saved.total ?? "—"}
          </strong>
        </span>
        <Link href={mockResultsUrl(mockId, attemptId || "")} className="font-semibold hover:underline">
          ← Back to results
        </Link>
      </div>

      {test.test_type === "Reading" && (
        <div className="flex-1 min-h-0 overflow-hidden">
        <MockReadingPanel
          task={adminTask}
          answers={saved.answers || {}}
          onAnswer={() => {}}
          readOnly
          showFeedback
        />
        </div>
      )}

      {test.test_type === "Writing" && (
        <div className="flex-1 min-h-0 overflow-hidden">
        <MockWritingPanel
          task={adminTask as Parameters<typeof MockWritingPanel>[0]["task"]}
          response={saved.studentResponse || ""}
          onResponse={() => {}}
          task2Choice={saved.writingTask2Choice ?? null}
          onTask2Choice={() => {}}
          readOnly
        />
        </div>
      )}

      {test.test_type === "Listening" && (
        <div className="p-8 max-w-3xl mx-auto w-full">
          <div className="space-y-6">
            {(saved.questions as { id: number; question: string; options: Record<string, string>; correct_answer: string; explanation?: string }[] | undefined)?.map((q, i) => {
              const picked = saved.answers?.[q.id] as string | undefined;
              const correct = q.correct_answer;
              return (
                <div key={`${q.id}-${i}`} className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    {i + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {(["A", "B", "C", "D"] as const).map(opt => {
                      const isPicked = picked === opt;
                      const isCorrect = opt === correct;
                      return (
                        <div
                          key={`${i}-${opt}`}
                          className={`px-4 py-2 rounded-lg border text-sm ${
                            isCorrect
                              ? "border-green-500 bg-green-50"
                              : isPicked
                                ? "border-red-400 bg-red-50"
                                : "border-gray-100 bg-gray-50"
                          }`}
                        >
                          {opt}. {q.options[opt]}
                          {isPicked && <span className="ml-2 text-xs font-bold">(your answer)</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <p className="mt-2 text-xs text-yellow-800 bg-yellow-50 rounded px-3 py-2">{q.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {test.test_type === "Speaking" && (
        <div className="p-8 max-w-2xl mx-auto">
          {saved.transcript && (
            <div className="bg-white rounded-xl border p-4 mb-4">
              <p className="text-xs font-bold text-gray-600 mb-2">Transcript</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{saved.transcript}</p>
            </div>
          )}
          {saved.feedback && typeof saved.feedback === "object" && (
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs font-bold text-gray-600 mb-2">Band scores</p>
              <p className="text-2xl font-bold text-purple-700">
                Overall: {(saved.feedback as { overall_band?: number }).overall_band ?? saved.score}/12
              </p>
            </div>
          )}
        </div>
      )}
    </MockTestShell>
  );
}

export default function MockTestReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600">Loading…</p>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
