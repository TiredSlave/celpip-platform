"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { storeResultsReturn, taskReturnHref } from "../../../lib/practice-navigation";
import { navigatePracticeTask } from "../../../lib/practice-task-nav";
import { usePracticeTaskSiblings } from "../../../lib/use-practice-task-siblings";
import { PracticeTaskTypeDropdown } from "../../../components/PracticeTaskTypeDropdown";

type WritingTaskContent = {
  scenario?: string;
  instructions?: string;
  bullet_points?: string[];
  topic?: string;
  context?: string;
  question?: string;
  option_a?: string;
  option_b?: string;
  /** legacy shape from older generators */
  opinion_options?: string[];
  word_limit: number;
  time_limit_minutes: number;
  sample_answer?: string;
  sample_answer_band?: number;
  sample_answer_notes?: string[];
  recipient?: string;
  tone?: string;
};

type WritingTask = {
  id: string;
  task_type: string;
  content: WritingTaskContent;
};

const WRITING_PARTS = [
  { key: "Writing Task 1", label: "Task 1", title: "Writing an Email", timeMinutes: 27 },
  { key: "Writing Task 2", label: "Task 2", title: "Responding to Survey Questions", timeMinutes: 26 },
];

function WritingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const listReturnHref = taskReturnHref(searchParams, "/practice/writing");
  const fromLibrary = Boolean(taskId);
  const [tasks, setTasks] = useState<WritingTask[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentTask, setCurrentTask] = useState<WritingTask | null>(null);
  const [response, setResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(27 * 60);
  const [paused, setPaused] = useState(false);
  /** Writing Task 2: candidate must pick A or B before the response is evaluated as that choice */
  const [task2Choice, setTask2Choice] = useState<"A" | "B" | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const taskSiblings = usePracticeTaskSiblings(
    "writing",
    taskId,
    currentTask?.task_type,
  );

  useEffect(() => { void loadTasks(); }, [taskId]);

  useEffect(() => {
    if (tasks.length > 0) {
      const part = WRITING_PARTS[currentPartIndex];
      const found = tasks.find(t => t.task_type === part.key);
      setCurrentTask(found || null);
      setResponse("");
      setTask2Choice(null);
      setSubmitted(false);
      setSubmitError(null);
      setTimeLeft(part.timeMinutes * 60);
    }
  }, [currentPartIndex, tasks]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!loading && !paused && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            void handleSubmit();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, paused, submitted, currentPartIndex]);

  async function loadTasks() {
    setLoading(true);
    if (taskId) {
      const { data } = await supabase.from("admin_tasks").select("*").eq("id", taskId).single();
      if (data) {
        setCurrentTask(data as WritingTask);
        setResponse("");
        setTask2Choice(null);
        setSubmitted(false);
        setSubmitError(null);
        const idx = WRITING_PARTS.findIndex(p => p.key === (data as WritingTask).task_type);
        if (idx >= 0) setCurrentPartIndex(idx);
      }
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("admin_tasks")
      .select("*")
      .in("task_type", WRITING_PARTS.map(p => p.key))
      .order("created_at", { ascending: true });
    const latest: Record<string, WritingTask> = {};
    (data || []).forEach((t: WritingTask) => { latest[t.task_type] = t; });
    setTasks(Object.values(latest));
    setLoading(false);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function countWords(text: string) {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  }

  async function handleSubmit() {
    if (!currentTask || !response.trim()) return;
    if (currentTask.task_type === "Writing Task 2" && !task2Choice) {
      setSubmitError("For Task 2, select Option A or Option B above before submitting.");
      return;
    }
    setEvaluating(true);
    setSubmitError(null);
    if (timerRef.current) clearInterval(timerRef.current);
    const c = currentTask.content;
    const textA = c.option_a ?? c.opinion_options?.[0] ?? "";
    const textB = c.option_b ?? c.opinion_options?.[1] ?? "";
    const chosenOptionText = task2Choice === "A" ? textA : task2Choice === "B" ? textB : "";
    try {
      const res = await fetch("/api/writing/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: currentTask.task_type,
          content: currentTask.content,
          response,
          ...(currentTask.task_type === "Writing Task 2" && task2Choice
            ? { selectedOption: task2Choice, chosenOptionText }
            : {}),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setSubmitError(typeof data.error === "string" ? data.error : "Evaluation failed. Please try again.");
        setEvaluating(false);
        return;
      }
      const band = typeof data.band === "number" ? data.band : Number(data.band) || 0;
      setSubmitted(true);
      sessionStorage.setItem(
        "celpip_result",
        JSON.stringify({
          taskId: currentTask.id,
          taskType: currentTask.task_type,
          score: band,
          total: 12,
          answers: {},
          questions: [],
          studentResponse: response,
          writingTask2Choice: currentTask.task_type === "Writing Task 2" ? task2Choice : undefined,
          writingTask2ChosenLabel: currentTask.task_type === "Writing Task 2" && task2Choice ? chosenOptionText : undefined,
          feedback: data,
        }),
      );
      storeResultsReturn(listReturnHref);
      router.push("/practice/results");
    } catch {
      setSubmitError("Could not evaluate. Please try again.");
    }
    setEvaluating(false);
  }

  const currentPart = WRITING_PARTS[currentPartIndex];
  const wordCount = countWords(response);
  const wordLimit = currentTask?.content.word_limit || 200;
  const isOverLimit = wordCount > wordLimit;
  const isWritingTask2 = currentTask?.task_type === "Writing Task 2";
  const task2OptionA = currentTask?.content.option_a ?? currentTask?.content.opinion_options?.[0];
  const task2OptionB = currentTask?.content.option_b ?? currentTask?.content.opinion_options?.[1];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading writing tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top bar — aligned with reading task layout */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={listReturnHref} className="text-sm text-blue-600 hover:underline shrink-0 hidden sm:inline">← Library</Link>
          <PracticeTaskTypeDropdown
            section="writing"
            currentLabel={`Writing — ${currentPart.label}`}
            currentTaskType={currentTask?.task_type}
            className="truncate"
          />
          <span className="text-sm text-gray-600 truncate hidden md:inline">{currentPart.title}</span>
          {fromLibrary && taskSiblings.total > 0 && (
            <span className="text-xs text-gray-500 shrink-0">
              {taskSiblings.position} / {taskSiblings.total}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border-2 font-mono font-bold text-xs sm:text-sm ${
            timeLeft < 300 ? "border-red-500 text-red-600 bg-red-50" : "border-blue-500 text-blue-600 bg-blue-50"
          }`}>
            🕐 {formatTime(timeLeft)}
          </div>
          <button type="button" onClick={() => setPaused(p => !p)}
            className="px-3 sm:px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            {paused ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={() => {
            setResponse("");
            setTask2Choice(null);
            setSubmitError(null);
            setTimeLeft(currentPart.timeMinutes * 60);
          }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition" title="Clear draft & reset timer">
            🔄
          </button>
          <button type="button" onClick={() => void handleSubmit()} disabled={evaluating || submitted || !response.trim() || (isWritingTask2 && !task2Choice)}
            className="px-4 sm:px-5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition disabled:opacity-50">
            {evaluating ? "…" : "Submit Test"}
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {fromLibrary ? (
            <>
              <button
                type="button"
                onClick={() => taskSiblings.prevId && navigatePracticeTask(router, "writing", taskSiblings.prevId, listReturnHref)}
                disabled={!taskSiblings.prevId}
                className="px-2 sm:px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 transition"
              >
                PREV
              </button>
              <button
                type="button"
                onClick={() => taskSiblings.nextId && navigatePracticeTask(router, "writing", taskSiblings.nextId, listReturnHref)}
                disabled={!taskSiblings.nextId}
                className="px-2 sm:px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 transition"
              >
                NEXT
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setCurrentPartIndex(i => Math.max(0, i - 1))} disabled={currentPartIndex === 0}
                className="px-2 sm:px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 transition">
                PREV
              </button>
              <div className="flex gap-1">
                {WRITING_PARTS.map((p, i) => (
                  <button key={p.key} type="button" onClick={() => setCurrentPartIndex(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                      i === currentPartIndex ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setCurrentPartIndex(i => Math.min(WRITING_PARTS.length - 1, i + 1))}
                disabled={currentPartIndex === WRITING_PARTS.length - 1}
                className="px-2 sm:px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 transition">
                NEXT
              </button>
            </>
          )}
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 text-sm px-6 py-2 text-center">
          {submitError}
        </div>
      )}

      {!currentTask ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-white rounded-xl shadow p-10 max-w-md">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No task available</h2>
            <p className="text-gray-600 text-sm">No <strong>{currentPart.title}</strong> task generated yet.</p>
            <Link href={listReturnHref} className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Back to writing library</Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden" style={{ height: submitError ? "calc(100vh - 56px - 40px)" : "calc(100vh - 56px)" }}>

          {/* LEFT — prompt */}
          <div className="w-1/2 border-r border-gray-300 overflow-y-auto bg-white p-8">
            {!isWritingTask2 ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Read the following information:</h2>
                <p className="text-gray-800 text-sm leading-relaxed mb-6 whitespace-pre-wrap">{currentTask.content.scenario}</p>
                <hr className="border-gray-200 mb-5" />
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Your tasks</h3>
                <div className="space-y-3">
                  {currentTask.content.bullet_points?.map((point, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-gray-600 mt-0.5">•</span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-800 mb-2">📝 Tips</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Write between 150–{wordLimit} words</li>
                    <li>• Address ALL bullet points</li>
                    <li>• Match tone to the situation</li>
                    <li>• Use a clear greeting and closing where appropriate</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">CELPIP Writing Task 2</p>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{currentTask.content.topic || "Survey / decision task"}</h2>
                {currentTask.content.context && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Background</h3>
                    <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{currentTask.content.context}</p>
                  </div>
                )}
                {currentTask.content.question && (
                  <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-blue-900 mb-2">Your writing question</h3>
                    <p className="text-gray-900 text-sm font-medium leading-relaxed">{currentTask.content.question}</p>
                  </div>
                )}
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Your choice (required first)</h3>
                <p className="text-xs text-gray-600 mb-3">Select the option you will support in your writing. The AI will score your answer against this choice.</p>
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {task2OptionA && (
                    <button
                      type="button"
                      disabled={evaluating}
                      onClick={() => setTask2Choice("A")}
                      className={`text-left border-2 rounded-xl p-4 transition ${
                        task2Choice === "A" ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200" : "border-gray-200 bg-gray-50 hover:border-blue-300"
                      }`}
                    >
                      <p className="text-xs font-bold text-blue-700 mb-1">Option A {task2Choice === "A" && "✓ Selected"}</p>
                      <p className="text-sm text-gray-800 leading-relaxed">{task2OptionA}</p>
                    </button>
                  )}
                  {task2OptionB && (
                    <button
                      type="button"
                      disabled={evaluating}
                      onClick={() => setTask2Choice("B")}
                      className={`text-left border-2 rounded-xl p-4 transition ${
                        task2Choice === "B" ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200" : "border-gray-200 bg-gray-50 hover:border-blue-300"
                      }`}
                    >
                      <p className="text-xs font-bold text-blue-700 mb-1">Option B {task2Choice === "B" && "✓ Selected"}</p>
                      <p className="text-sm text-gray-800 leading-relaxed">{task2OptionB}</p>
                    </button>
                  )}
                </div>
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-800 mb-2">📝 Tips</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Pick A or B above, then write only in support of that option</li>
                    <li>• Give 2–3 specific reasons with brief examples</li>
                    <li>• Aim for about 150–{wordLimit} words in organized paragraphs</li>
                    <li>• End with a short conclusion that restates your choice</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* RIGHT — response area (reading-style: half width, gray background, section heading) */}
          <div className="w-1/2 overflow-y-auto bg-gray-50 p-8 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 className="text-xl font-bold text-gray-900">Write your response:</h2>
              <span className={`text-sm font-semibold ${isOverLimit ? "text-red-600" : "text-gray-600"}`}>
                Words: {wordCount} / {wordLimit}
              </span>
            </div>
            {isWritingTask2 && (
              <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${task2Choice ? "bg-white border-blue-200 text-gray-800" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
                {task2Choice ? (
                  <p>
                    <span className="font-semibold">You are writing for Option {task2Choice}.</span> Your essay should defend this choice with reasons and examples.
                  </p>
                ) : (
                  <p className="font-medium">Select Option A or B on the left before you write your response.</p>
                )}
              </div>
            )}
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              disabled={evaluating || (isWritingTask2 && !task2Choice)}
              placeholder={isWritingTask2 && !task2Choice ? "Choose Option A or B on the left first…" : "Type your response here…"}
              spellCheck={true}
              lang="en-CA"
              autoCorrect="off"
              autoCapitalize="sentences"
              className="flex-1 min-h-[280px] w-full resize-y bg-white border border-gray-200 rounded-xl p-5 text-gray-800 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100"
            />
            <button type="button" onClick={() => void handleSubmit()} disabled={evaluating || submitted || !response.trim() || (isWritingTask2 && !task2Choice)}
              className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
              {evaluating ? "Submitting…" : "Submit Test"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WritingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WritingContent />
    </Suspense>
  );
}
