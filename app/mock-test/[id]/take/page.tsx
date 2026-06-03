"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import MockTestShell from "../../../components/mock-test/MockTestShell";
import MockReadingPanel from "../../../components/mock-test/MockReadingPanel";
import MockWritingPanel from "../../../components/mock-test/MockWritingPanel";
import { useStrictCountdown } from "../../../hooks/useStrictCountdown";
import type { MockPartResult } from "../../../lib/mock-test-results";
import { getPartResult } from "../../../lib/mock-test-results";
import {
  clearMockTimer,
  mockResultsUrl,
  practiceUrlWithMock,
  saveMockPartResult,
  setMockTimer,
} from "../../../lib/mock-test-runner";
import { secondsForMockPart } from "../../../lib/mock-test-times";
import type { MockTestSkill } from "../../../lib/mock-test-types";
import { partNumberFromRow, readingPartLabel } from "../../../lib/reading-task-types";

type MockTask = {
  id: string;
  order_number: number;
  task_id: string;
  admin_tasks: {
    id: string;
    task_type: string;
    title: string | null;
    content: Record<string, unknown>;
    section?: string | null;
    sequence_number?: number | null;
  };
};

type MockTest = {
  id: string;
  title: string;
  test_type: MockTestSkill;
  time_limit_minutes: number;
};

type Attempt = {
  id: string;
  status: string;
  completed_orders: number[];
  current_order: number;
  task_results: Record<string, MockPartResult>;
};

function scoreReadingTask(
  content: Record<string, unknown>,
  answers: Record<string | number, string>,
): { score: number; total: number } {
  const questions = (content.questions as { id: number; correct_answer: string }[]) || [];
  const blanks =
    (content.fill_in_blank as { blanks: { id: number; correct_answer: string }[] } | undefined)?.blanks || [];
  let correct = 0;
  questions.forEach(q => {
    if (answers[q.id] === q.correct_answer) correct++;
  });
  blanks.forEach(b => {
    if (answers[b.id] === b.correct_answer) correct++;
  });
  return { score: correct, total: questions.length + blanks.length };
}

function TakeContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mockId = params.id as string;

  const [test, setTest] = useState<MockTest | null>(null);
  const [tasks, setTasks] = useState<MockTask[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [order, setOrder] = useState(1);
  const [answers, setAnswers] = useState<Record<string | number, string>>({});
  const [writingResponse, setWritingResponse] = useState("");
  const [task2Choice, setTask2Choice] = useState<"A" | "B" | null>(null);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const advancingRef = useRef(false);

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.order_number - b.order_number),
    [tasks],
  );
  const currentSlot = sortedTasks.find(t => t.order_number === order);
  const skill = test?.test_type;
  const totalParts = sortedTasks.length;

  const partSeconds = useMemo(() => {
    if (!skill || !currentSlot) return 600;
    return secondsForMockPart(skill, order, currentSlot.admin_tasks.task_type);
  }, [skill, order, currentSlot]);

  const partLabel = useMemo(() => {
    if (!currentSlot) return "";
    if (skill === "Reading") {
      const n = partNumberFromRow(currentSlot.admin_tasks);
      return n ? readingPartLabel(`task ${n}`) : `Part ${order}`;
    }
    return currentSlot.admin_tasks.task_type;
  }, [currentSlot, skill, order]);

  const finishPart = useCallback(
    async (result: MockPartResult) => {
      if (!attempt || advancingRef.current) return;
      advancingRef.current = true;
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/login?next=/mock-test/${mockId}/take`);
        return;
      }

      const saved = await saveMockPartResult(mockId, attempt.id, order, result, session.access_token);
      if (!saved.ok) {
        advancingRef.current = false;
        setSaving(false);
        alert(saved.error || "Could not save progress.");
        return;
      }

      const updated = saved.attempt as Attempt;
      setAttempt(updated);

      const isLast = order >= totalParts;
      clearMockTimer();
      if (isLast) {
        router.push(mockResultsUrl(mockId, attempt.id));
        return;
      }
      const next = order + 1;
      setOrder(next);
      setAnswers({});
      setWritingResponse("");
      setTask2Choice(null);
      advancingRef.current = false;
      setSaving(false);
    },
    [attempt, mockId, order, router, totalParts],
  );

  const handleExpire = useCallback(() => {
    void (async () => {
      if (!currentSlot || !skill) return;
      if (skill === "Reading") {
        const content = currentSlot.admin_tasks.content;
        const { score, total } = scoreReadingTask(content, answers);
        await finishPart({
          taskId: currentSlot.task_id,
          taskType: currentSlot.admin_tasks.task_type,
          answers,
          score,
          total,
          completedAt: new Date().toISOString(),
        });
      } else if (skill === "Writing") {
        await finishPart({
          taskId: currentSlot.task_id,
          taskType: currentSlot.admin_tasks.task_type,
          answers: {},
          studentResponse: writingResponse,
          writingTask2Choice: task2Choice ?? undefined,
          score: 0,
          total: 12,
          completedAt: new Date().toISOString(),
        });
      }
    })();
  }, [answers, currentSlot, finishPart, skill, task2Choice, writingResponse]);

  const { timeLeft } = useStrictCountdown(partSeconds, Boolean(currentSlot && !saving), handleExpire);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await fetch(`/api/mock-tests/${mockId}`);
    if (!res.ok) {
      setLoadError("Mock test not found or not published.");
      setLoading(false);
      return;
    }
    const json = await res.json();
    setTest(json.test);
    setTasks(json.tasks || []);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push(`/login?next=/mock-test/${mockId}/take`);
      return;
    }

    const attemptRes = await fetch(`/api/mock-tests/${mockId}/attempt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!attemptRes.ok) {
      const errJson = await attemptRes.json().catch(() => ({}));
      setLoadError(
        (errJson.error as string) ||
          "Could not start your attempt. Run docs/supabase-mock-tests.sql in Supabase if the attempts table is missing.",
      );
      setLoading(false);
      return;
    }
    const { attempt: att } = await attemptRes.json();
    if (att.status === "submitted") {
      router.replace(mockResultsUrl(mockId, att.id));
      return;
    }
    setAttempt(att);

    const qOrder = searchParams.get("order");
    const savedOrder =
      typeof att.current_order === "number" && att.current_order >= 1
        ? att.current_order
        : 1;
    const startOrder = qOrder ? Number(qOrder) : savedOrder;
    setOrder(startOrder);

    const existing = getPartResult(att.task_results, startOrder);
    if (existing) {
      setAnswers(existing.answers || {});
      setWritingResponse(existing.studentResponse || "");
      setTask2Choice(existing.writingTask2Choice ?? null);
    }
    setLoading(false);
  }, [mockId, router, searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!test || !attempt || !currentSlot || !skill) return;
    if (skill === "Listening" || skill === "Speaking") {
      const secs = secondsForMockPart(skill, order, currentSlot.admin_tasks.task_type);
      setMockTimer({
        mockTestId: mockId,
        attemptId: attempt.id,
        order,
        deadlineMs: Date.now() + secs * 1000,
      });
      router.replace(
        practiceUrlWithMock(skill, currentSlot.task_id, mockId, attempt.id, order),
      );
    }
  }, [test, attempt, currentSlot, skill, order, mockId, router]);

  async function handleNext() {
    if (!currentSlot || !skill || saving || evaluating) return;

    if (skill === "Reading") {
      const content = currentSlot.admin_tasks.content;
      const { score, total } = scoreReadingTask(content, answers);
      await finishPart({
        taskId: currentSlot.task_id,
        taskType: currentSlot.admin_tasks.task_type,
        answers,
        score,
        total,
        completedAt: new Date().toISOString(),
      });
      return;
    }

    if (skill === "Writing") {
      if (!writingResponse.trim()) {
        alert("Please enter a response before continuing.");
        return;
      }
      if (currentSlot.admin_tasks.task_type === "Writing Task 2" && !task2Choice) {
        alert("Select Option A or B for Task 2.");
        return;
      }
      setEvaluating(true);
      const c = currentSlot.admin_tasks.content as {
        option_a?: string;
        option_b?: string;
        opinion_options?: string[];
      };
      const textA = c.option_a ?? c.opinion_options?.[0] ?? "";
      const textB = c.option_b ?? c.opinion_options?.[1] ?? "";
      const chosenLabel = task2Choice === "A" ? textA : task2Choice === "B" ? textB : "";
      try {
        const res = await fetch("/api/writing/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskType: currentSlot.admin_tasks.task_type,
            content: currentSlot.admin_tasks.content,
            response: writingResponse,
            ...(task2Choice
              ? { selectedOption: task2Choice, chosenOptionText: chosenLabel }
              : {}),
          }),
        });
        const data = await res.json();
        const band = typeof data.band === "number" ? data.band : Number(data.band) || 0;
        await finishPart({
          taskId: currentSlot.task_id,
          taskType: currentSlot.admin_tasks.task_type,
          answers: {},
          studentResponse: writingResponse,
          writingTask2Choice: task2Choice ?? undefined,
          writingTask2ChosenLabel: chosenLabel || undefined,
          feedback: data,
          score: band,
          total: 12,
          completedAt: new Date().toISOString(),
        });
      } catch {
        alert("Evaluation failed. Try again or wait for the timer to auto-advance.");
      }
      setEvaluating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading mock test…</p>
        </div>
      </div>
    );
  }

  if (loadError || !test || !attempt) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-700 max-w-md">{loadError || "Unable to load this mock test."}</p>
        <Link href={`/mock-test/${mockId}`} className="text-indigo-700 font-medium hover:underline">
          ← Back
        </Link>
      </div>
    );
  }

  if (!currentSlot || !skill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Invalid part.</p>
        <Link href={`/mock-test/${mockId}`} className="ml-2 text-indigo-700 underline">
          Back
        </Link>
      </div>
    );
  }

  if (skill === "Listening" || skill === "Speaking") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Opening {skill.toLowerCase()} task…</p>
      </div>
    );
  }

  const isLast = order >= totalParts;

  return (
    <MockTestShell
      skill={skill}
      mockTitle={test.title}
      partLabel={`Part ${order}`}
      partTitle={partLabel}
      order={order}
      totalParts={totalParts}
      timeLeft={timeLeft}
      onNext={() => void handleNext()}
      nextLabel={evaluating ? "Evaluating…" : isLast ? "Finish mock" : "Next part"}
      nextDisabled={saving || evaluating}
      backHref={`/mock-test/${mockId}`}
    >
      {skill === "Reading" && (
        <MockReadingPanel
          task={currentSlot.admin_tasks}
          answers={answers}
          onAnswer={(id, val) => setAnswers(prev => ({ ...prev, [id]: val }))}
        />
      )}
      {skill === "Writing" && (
        <MockWritingPanel
          task={currentSlot.admin_tasks}
          response={writingResponse}
          onResponse={setWritingResponse}
          task2Choice={task2Choice}
          onTask2Choice={setTask2Choice}
        />
      )}
    </MockTestShell>
  );
}

export default function MockTestTakePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600">Loading…</p>
        </div>
      }
    >
      <TakeContent />
    </Suspense>
  );
}
