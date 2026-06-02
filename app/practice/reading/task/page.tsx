"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { VocabularySelectableText } from "../../../components/VocabularySelectableText";
import { ReadingLabeledPassage } from "../../../components/reading/ReadingLabeledPassage";
import { PracticeTaskTypeDropdown } from "../../../components/PracticeTaskTypeDropdown";
import { storeResultsReturn, taskReturnHref } from "../../../lib/practice-navigation";
import { navigatePracticeTask } from "../../../lib/practice-task-nav";
import { usePracticeTaskSiblings } from "../../../lib/use-practice-task-siblings";
import { supabase } from "../../../lib/supabase";
import {
  READING_PARTS,
  READING_TASK_TYPE_KEYS,
  matchesReadingPracticeFilter,
  partNumberFromRow,
} from "../../../lib/reading-task-types";

type Question = {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  explanation: string;
};

type ReadingTask = {
  id: string;
  task_type: string;
  section?: string | null;
  sequence_number?: number | null;
  content: {
    title: string;
    passage?: string;
    main_message?: { from: string; to: string; subject: string; body: string };
    response_message?: { from: string; to: string; subject: string; body: string };
    fill_in_blank?: {
      instruction: string;
      from?: string;
      to?: string;
      subject?: string;
      text_with_blanks: string;
      blanks: { id: number; options: Record<string,string>; correct_answer: string; explanation: string; option_explanations?: Record<string,string> }[];
    };
    html_content?: string;
    viewpoints?: { name: string; role: string; opinion: string }[];
    topic?: string;
    questions: Question[];
  };
};

function ReadingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const listReturnHref = taskReturnHref(searchParams, "/practice/reading");
  const fromLibrary = Boolean(taskId);
  const [tasks, setTasks] = useState<ReadingTask[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentTask, setCurrentTask] = useState<ReadingTask | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(READING_PARTS[0].timeMinutes * 60);
  const [paused, setPaused] = useState(false);
  const [maxPartReached, setMaxPartReached] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const taskSiblings = usePracticeTaskSiblings(
    "reading",
    taskId,
    currentTask?.task_type,
    currentTask ?? undefined,
  );

  useEffect(() => {
    void loadTasks();
  }, [taskId]);

  useEffect(() => {
    if (fromLibrary) return;
    if (tasks.length > 0) {
      const part = READING_PARTS[currentPartIndex];
      const found = tasks.find(t => matchesReadingPracticeFilter(t, part.key));
      setCurrentTask(found || null);
      setAnswers({});
      setSubmitted(false);
      setScore(null);
    }
  }, [currentPartIndex, tasks, fromLibrary]);

  useEffect(() => {
    setTimeLeft(READING_PARTS[currentPartIndex].timeMinutes * 60);
  }, [currentPartIndex, currentTask?.id]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!loading && !paused && !submitted && currentTask) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            handleTimeExpired();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, paused, submitted, currentTask, currentPartIndex, fromLibrary]);

  async function loadTasks() {
    setLoading(true);
    setLoadError(null);
    if (taskId) {
      const { data, error } = await supabase
        .from("admin_tasks")
        .select("*")
        .eq("id", taskId)
        .maybeSingle();
      if (error) {
        setLoadError(error.message);
        setCurrentTask(null);
      } else if (data) {
        const task: ReadingTask = {
          ...(data as ReadingTask),
          content: (data as ReadingTask).content ?? { title: "", questions: [] },
        };
        setCurrentTask(task);
        setAnswers({});
        setSubmitted(false);
        setScore(null);
        const idx = READING_PARTS.findIndex(p => matchesReadingPracticeFilter(task, p.key));
        if (idx >= 0) {
          setCurrentPartIndex(idx);
          setMaxPartReached(idx);
        }
      } else {
        setLoadError("Task not found. It may have been deleted or you may not have access.");
        setCurrentTask(null);
      }
      setLoading(false);
      return;
    }
    let { data } = await supabase
      .from("admin_tasks")
      .select("*")
      .in("task_type", [...READING_TASK_TYPE_KEYS])
      .order("created_at", { ascending: true });
    if (!data?.length) {
      const fallback = await supabase
        .from("admin_tasks")
        .select("*")
        .eq("section", "Reading")
        .order("created_at", { ascending: true });
      data = fallback.data;
    }
    const latest: Record<string, ReadingTask> = {};
    (data || []).forEach((t: ReadingTask) => {
      const num = partNumberFromRow(t);
      // Pick the newest available task for each reading part.
      if (num !== null) latest[`task ${num}`] = t;
    });
    setTasks(Object.values(latest));
    setLoading(false);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function handleAnswer(questionId: number, option: string) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  }

  function goToPart(index: number) {
    if (fromLibrary || index === currentPartIndex || index > maxPartReached) return;
    setCurrentPartIndex(index);
  }

  function goToNextPart() {
    if (fromLibrary || currentPartIndex >= READING_PARTS.length - 1) return;
    const next = currentPartIndex + 1;
    setMaxPartReached(m => Math.max(m, next));
    setCurrentPartIndex(next);
  }

  function handleTimeExpired() {
    if (!fromLibrary && currentPartIndex < READING_PARTS.length - 1) {
      goToNextPart();
      return;
    }
    handleSubmit();
  }

  function handleSubmit() {
    if (!currentTask?.content) return;
    const questions = currentTask.content.questions || [];
    const blanks = currentTask.content.fill_in_blank?.blanks || [];
    let correct = 0;
    questions.forEach(q => { if (answers[q.id] === q.correct_answer) correct++; });
    blanks.forEach((b: any) => { if (answers[b.id] === b.correct_answer) correct++; });
    const total = questions.length + blanks.length;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
    const result = {
      taskId: currentTask.id,
      taskType: currentTask.task_type,
      score: correct,
      total,
      answers,
      questions: [...questions, ...blanks.map((b: any) => ({
        id: b.id,
        question: `Blank ${b.id}`,
        options: b.options,
        correct_answer: b.correct_answer,
        explanation: b.explanation,
        option_explanations: b.option_explanations,
      }))],
    };
    sessionStorage.setItem("celpip_result", JSON.stringify(result));
    storeResultsReturn(listReturnHref);
    router.push("/practice/results");
  }

  const currentPart = READING_PARTS[currentPartIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading reading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <PracticeTaskTypeDropdown
            section="reading"
            currentLabel={`Reading — ${currentPart.label}`}
            currentTaskType={currentTask?.task_type}
            taskRow={currentTask ?? undefined}
          />
          <span className="text-sm text-gray-600">{currentPart.title}</span>
          {fromLibrary && taskSiblings.total > 0 && (
            <span className="text-xs text-gray-500">
              {taskSiblings.position} / {taskSiblings.total}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border-2 font-mono font-bold text-sm ${
            timeLeft < 300 ? "border-red-500 text-red-600 bg-red-50" : "border-blue-500 text-blue-600 bg-blue-50"
          }`}>
            🕐 {formatTime(timeLeft)}
          </div>
          <button onClick={() => setPaused(p => !p)}
            className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            {paused ? "Resume" : "Pause"}
          </button>
          <button onClick={() => {
            setAnswers({});
            setSubmitted(false);
            setScore(null);
            setTimeLeft(currentPart.timeMinutes * 60);
          }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition" title="Reset">
            🔄
          </button>
          <button onClick={handleSubmit} disabled={submitted}
            className="px-5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition disabled:opacity-50">
            Submit Test
          </button>
        </div>

        <div className="flex items-center gap-2">
          {fromLibrary ? (
            <>
              <button
                type="button"
                onClick={() => taskSiblings.prevId && navigatePracticeTask(router, "reading", taskSiblings.prevId, listReturnHref)}
                disabled={!taskSiblings.prevId}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 transition"
              >
                PREV
              </button>
              <button
                type="button"
                onClick={() => taskSiblings.nextId && navigatePracticeTask(router, "reading", taskSiblings.nextId, listReturnHref)}
                disabled={!taskSiblings.nextId}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 transition"
              >
                NEXT
              </button>
            </>
          ) : (
            <>
              <button onClick={() => goToPart(currentPartIndex - 1)} disabled={currentPartIndex === 0}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 transition">
                PREV
              </button>
              <div className="flex gap-1">
                {READING_PARTS.map((p, i) => (
                  <button key={p.key} onClick={() => goToPart(i)}
                    disabled={i > maxPartReached}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                      i === currentPartIndex ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <button onClick={goToNextPart}
                disabled={currentPartIndex === READING_PARTS.length - 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 transition">
                NEXT
              </button>
            </>
          )}
        </div>
      </div>

      {/* Score Banner */}
      {submitted && score !== null && currentTask && (
        <div className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between">
          <span className="font-semibold">
            ✅ Score: {score} / {currentTask.content.questions?.length} correct
          </span>
          {currentPartIndex < READING_PARTS.length - 1 && (
            <button onClick={() => goToNextPart()}
              className="bg-white text-blue-600 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-50 transition">
              Next Part →
            </button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {loadError || !currentTask ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center bg-white rounded-xl shadow p-10 max-w-md">
              <div className="text-5xl mb-4">📭</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {loadError ? "Task not found" : "No task available"}
              </h2>
              <p className="text-gray-600 text-sm mt-2">
                {loadError || `No ${currentPart.title} task generated yet.`}
              </p>
              {taskId && <p className="text-xs text-gray-600 mt-2 font-mono">ID: {taskId}</p>}
              <Link
                href={listReturnHref}
                className="inline-block mt-6 text-sm font-semibold text-green-600 hover:underline"
              >
                ← Back to Reading Practice
              </Link>
            </div>
          </div>
        ) : (
          <div className="h-full flex overflow-hidden">

          {/* LEFT — Passage */}
          <div className="w-1/2 border-r border-gray-300 overflow-y-auto bg-white p-8 min-h-0">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{currentPart.instruction}</h2>

            {currentTask.content?.main_message && (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                  <p className="text-xs text-gray-600 mb-1">From: <span className="text-gray-700">{currentTask.content.main_message.from}</span></p>
                  <p className="text-xs text-gray-600 mb-1">To: <span className="text-gray-700">{currentTask.content.main_message.to}</span></p>
                  <p className="text-xs text-gray-600 mb-3">Subject: <span className="text-gray-700 font-semibold">{currentTask.content.main_message.subject}</span></p>
                  <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    <VocabularySelectableText text={currentTask.content.main_message.body} source="reading" taskId={currentTask.id} />
                  </div>
                </div>
                {currentTask.content.response_message && !currentTask.content.fill_in_blank && (
                  <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                    <p className="text-xs text-gray-600 mb-1">From: <span className="text-gray-700">{currentTask.content.response_message.from}</span></p>
                    <p className="text-xs text-gray-600 mb-1">To: <span className="text-gray-700">{currentTask.content.response_message.to}</span></p>
                    <p className="text-xs text-gray-600 mb-3">Subject: <span className="text-gray-700 font-semibold">{currentTask.content.response_message.subject}</span></p>
                    <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                      <VocabularySelectableText text={currentTask.content.response_message.body} source="reading" taskId={currentTask.id} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentTask.content?.html_content && (
              <div className="border border-gray-200 rounded-lg overflow-auto bg-white p-4 text-sm reading-html-content"
                style={{color: "#1a1a1a"}}
                dangerouslySetInnerHTML={{ __html: currentTask.content.html_content }} />
            )}

            {currentTask.content?.response_message && !currentTask.content?.main_message && (
              <div className="border border-gray-200 rounded-lg p-5 bg-gray-50 mt-5">
                <p className="text-xs text-gray-600 mb-1">From: <span className="text-gray-700">{currentTask.content.response_message.from}</span></p>
                <p className="text-xs text-gray-600 mb-1">To: <span className="text-gray-700">{currentTask.content.response_message.to}</span></p>
                <p className="text-xs text-gray-600 mb-3">Subject: <span className="text-gray-700 font-semibold">{currentTask.content.response_message.subject}</span></p>
                <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                  <VocabularySelectableText text={currentTask.content.response_message.body} source="reading" taskId={currentTask.id} />
                </div>
              </div>
            )}

            {currentTask.content?.passage && (
              <div className="text-gray-800 text-sm leading-relaxed">
                <h3 className="font-bold text-gray-900 text-base mb-3">{currentTask.content.title}</h3>
                {(() => {
                  const part = partNumberFromRow(currentTask);
                  if (part === 3 || part === 4) {
                    return (
                      <ReadingLabeledPassage
                        passage={currentTask.content.passage}
                        taskId={currentTask.id}
                      />
                    );
                  }
                  return (
                    <div className="whitespace-pre-wrap">
                      <VocabularySelectableText
                        text={currentTask.content.passage}
                        source="reading"
                        taskId={currentTask.id}
                      />
                    </div>
                  );
                })()}
              </div>
            )}

            {currentTask.content?.viewpoints && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Topic: {currentTask.content.topic}</p>
                {currentTask.content.viewpoints.map((v, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-bold text-gray-800 mb-1">{v.name} — <span className="font-normal text-gray-600">{v.role}</span></p>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      <VocabularySelectableText text={v.opinion} source="reading" taskId={currentTask.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Questions */}
          <div className="w-1/2 overflow-y-auto bg-gray-50 p-8 min-h-0">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Choose the best option according to the information given in the message:
            </h2>
            <div className="space-y-8">
              {currentTask.content.questions?.map((q, i) => (
                <div key={`${q.id}-${i}`}>
                  <p className="text-sm font-semibold text-gray-800 mb-3">{i + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {(["A", "B", "C", "D"] as const).map(opt => {
                      const isSelected = answers[q.id] === opt;
                      const isCorrect = opt === q.correct_answer;
                      const isWrong = submitted && isSelected && !isCorrect;
                      const showCorrect = submitted && isCorrect;
                      return (
                        <button key={`${q.id}-${opt}`} onClick={() => handleAnswer(q.id, opt)}
                          className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition flex items-center gap-3 ${
                            showCorrect ? "border-green-500 bg-green-50 text-green-800"
                            : isWrong ? "border-red-400 bg-red-50 text-red-800"
                            : isSelected ? "border-blue-500 bg-blue-50 text-blue-800"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                          }`}>
                          <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                            showCorrect ? "border-green-500 bg-green-500 text-white"
                            : isWrong ? "border-red-400 bg-red-400 text-white"
                            : isSelected ? "border-blue-500 bg-blue-500 text-white"
                            : "border-gray-300"
                          }`}>
                            {showCorrect ? "✓" : isWrong ? "✗" : isSelected ? opt : ""}
                          </span>
                          <span>{opt}. {q.options[opt]}</span>
                        </button>
                      );
                    })}
                  </div>
                  {submitted && (
                    <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-xs text-yellow-800">
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Fill in blank section */}
            {currentTask.content?.fill_in_blank && (
              <div className="mt-8 border-t-2 border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {currentTask.content.fill_in_blank.instruction}
                </h3>
                {currentTask.content.fill_in_blank.from && (
                  <div className="text-xs text-gray-600 mb-3 bg-white border border-gray-200 rounded-lg p-3">
                    <div>From: <span className="text-gray-700">{currentTask.content.fill_in_blank.from}</span></div>
                    <div>To: <span className="text-gray-700">{currentTask.content.fill_in_blank.to}</span></div>
                    <div>Subject: <span className="text-gray-700 font-semibold">{currentTask.content.fill_in_blank.subject}</span></div>
                  </div>
                )}
                <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-800 leading-loose">
                  {currentTask.content.fill_in_blank.text_with_blanks?.split(/(\[BLANK_\d+\])/).map((part: string, idx: number) => {
                    const match = part.match(/\[BLANK_(\d+)\]/);
                    if (match) {
                      const blankId = parseInt(match[1]);
                      const blank = currentTask.content.fill_in_blank?.blanks?.find((b: any) => b.id === blankId);
                      if (!blank) return <span key={idx}>{part}</span>;
                      const isCorrect = submitted && answers[blankId] === blank.correct_answer;
                      const isWrong = submitted && answers[blankId] && answers[blankId] !== blank.correct_answer;
                      return (
                        <select key={idx}
                          value={answers[blankId] || ""}
                          onChange={e => !submitted && setAnswers(prev => ({ ...prev, [blankId]: e.target.value }))}
                          disabled={submitted}
                          className={`inline-block mx-1 px-2 py-0.5 rounded border text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            isCorrect ? "border-green-500 bg-green-50 text-green-800"
                            : isWrong ? "border-red-400 bg-red-50 text-red-800"
                            : "border-blue-300 bg-blue-50 text-blue-800"
                          }`}>
                          <option value="" disabled>{blankId}....</option>
                          {Object.entries(blank.options as Record<string,string>).map(([k, v]) => (
                            <option key={`${blankId}-${k}`} value={k}>{k}. {v}</option>
                          ))}
                        </select>
                      );
                    }
                    return <span key={idx}>{part}</span>;
                  })}
                </div>
                {submitted && currentTask.content.fill_in_blank.blanks?.map((blank: any) => (
                  <div key={blank.id} className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-xs text-yellow-800">
                    <span className="font-bold">Blank {blank.id}:</span> Correct: <span className="font-bold">{blank.correct_answer}. {blank.options[blank.correct_answer]}</span> — {blank.explanation}
                  </div>
                ))}
              </div>
            )}

            {!submitted && (
              <button onClick={handleSubmit}
                className="mt-8 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition">
                Submit Answers
              </button>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default function ReadingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ReadingContent />
    </Suspense>
  );
}
