"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";

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
  content: {
    title: string;
    passage?: string;
    main_message?: { from: string; to: string; subject: string; body: string };
    response_message?: { from: string; to: string; subject: string; body: string };
    html_content?: string;
    viewpoints?: { name: string; role: string; opinion: string }[];
    topic?: string;
    questions: Question[];
  };
};

const READING_PARTS = [
  { key: "Reading Correspondence",       label: "Part 1", title: "Reading Correspondence",       instruction: "Read the following message" },
  { key: "Reading to Apply Information", label: "Part 2", title: "Reading to Apply Information", instruction: "Read the following information" },
  { key: "Reading for Information",      label: "Part 3", title: "Reading for Information",      instruction: "Read the following passage" },
  { key: "Reading for Viewpoints",       label: "Part 4", title: "Reading for Viewpoints",       instruction: "Read the following viewpoints" },
];

export default function ReadingPage() {
  const [tasks, setTasks] = useState<ReadingTask[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentTask, setCurrentTask] = useState<ReadingTask | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(55 * 60);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { loadTasks(); }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      const part = READING_PARTS[currentPartIndex];
      const found = tasks.find(t => t.task_type === part.key);
      setCurrentTask(found || null);
      setAnswers({});
      setSubmitted(false);
      setScore(null);
    }
  }, [currentPartIndex, tasks]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!loading && !paused && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current!); handleSubmit(); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, paused, submitted]);

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase
      .from("admin_tasks")
      .select("*")
      .in("task_type", READING_PARTS.map(p => p.key))
      .order("created_at", { ascending: false });
    const latest: Record<string, ReadingTask> = {};
    (data || []).forEach((t: ReadingTask) => { if (!latest[t.task_type]) latest[t.task_type] = t; });
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

  function handleSubmit() {
    if (!currentTask) return;
    const questions = currentTask.content.questions || [];
    let correct = 0;
    questions.forEach(q => { if (answers[q.id] === q.correct_answer) correct++; });
    if (timerRef.current) clearInterval(timerRef.current);
    // Save result and redirect to results page
    const result = {
      taskId: currentTask.id,
      taskType: currentTask.task_type,
      score: correct,
      total: questions.length,
      answers,
      questions,
    };
    sessionStorage.setItem("celpip_result", JSON.stringify(result));
    window.location.href = "/results";
  }

  const currentPart = READING_PARTS[currentPartIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading reading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-800">Reading — {currentPart.label}</span>
          <span className="text-sm text-gray-500">{currentPart.title}</span>
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
          <button onClick={() => { setAnswers({}); setSubmitted(false); setScore(null); }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition" title="Reset">
            🔄
          </button>
          <button onClick={handleSubmit} disabled={submitted}
            className="px-5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition disabled:opacity-50">
            Submit Test
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPartIndex(i => Math.max(0, i - 1))} disabled={currentPartIndex === 0}
            className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 transition">
            PREV
          </button>
          <div className="flex gap-1">
            {READING_PARTS.map((p, i) => (
              <button key={p.key} onClick={() => setCurrentPartIndex(i)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                  i === currentPartIndex ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
          <button onClick={() => setCurrentPartIndex(i => Math.min(READING_PARTS.length - 1, i + 1))}
            disabled={currentPartIndex === READING_PARTS.length - 1}
            className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 transition">
            NEXT
          </button>
        </div>
      </div>

      {/* Score Banner */}
      {submitted && score !== null && currentTask && (
        <div className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between">
          <span className="font-semibold">
            ✅ Score: {score} / {currentTask.content.questions?.length} correct
          </span>
          {currentPartIndex < READING_PARTS.length - 1 && (
            <button onClick={() => { setCurrentPartIndex(i => i + 1); }}
              className="bg-white text-blue-600 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-50 transition">
              Next Part →
            </button>
          )}
        </div>
      )}

      {!currentTask ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-white rounded-xl shadow p-10 max-w-md">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No task available</h2>
            <p className="text-gray-500 text-sm">No <strong>{currentPart.title}</strong> task generated yet.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>

          {/* LEFT — Passage */}
          <div className="w-1/2 border-r border-gray-300 overflow-y-auto bg-white p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{currentPart.instruction}</h2>

            {currentTask.content.main_message && (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1">From: <span className="text-gray-700">{currentTask.content.main_message.from}</span></p>
                  <p className="text-xs text-gray-500 mb-1">To: <span className="text-gray-700">{currentTask.content.main_message.to}</span></p>
                  <p className="text-xs text-gray-500 mb-3">Subject: <span className="text-gray-700 font-semibold">{currentTask.content.main_message.subject}</span></p>
                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{currentTask.content.main_message.body}</p>
                </div>
                {currentTask.content.response_message && (
                  <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">From: <span className="text-gray-700">{currentTask.content.response_message.from}</span></p>
                    <p className="text-xs text-gray-500 mb-1">To: <span className="text-gray-700">{currentTask.content.response_message.to}</span></p>
                    <p className="text-xs text-gray-500 mb-3">Subject: <span className="text-gray-700 font-semibold">{currentTask.content.response_message.subject}</span></p>
                    <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{currentTask.content.response_message.body}</p>
                  </div>
                )}
              </div>
            )}

            {currentTask.content.html_content && (
              <div className="border border-gray-200 rounded-lg overflow-auto bg-white p-4 text-sm"
                dangerouslySetInnerHTML={{ __html: currentTask.content.html_content }} />
            )}

            {currentTask.content.passage && (
              <div className="text-gray-800 text-sm leading-relaxed">
                <h3 className="font-bold text-gray-900 text-base mb-3">{currentTask.content.title}</h3>
                <p className="whitespace-pre-wrap">{currentTask.content.passage}</p>
              </div>
            )}

            {currentTask.content.viewpoints && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Topic: {currentTask.content.topic}</p>
                {currentTask.content.viewpoints.map((v, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-bold text-gray-800 mb-1">{v.name} — <span className="font-normal text-gray-500">{v.role}</span></p>
                    <p className="text-sm text-gray-700 leading-relaxed">{v.opinion}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Questions */}
          <div className="w-1/2 overflow-y-auto bg-gray-50 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Choose the best option according to the information given in the message:
            </h2>
            <div className="space-y-8">
              {currentTask.content.questions?.map((q, i) => (
                <div key={q.id}>
                  <p className="text-sm font-semibold text-gray-800 mb-3">{i + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {(["A", "B", "C", "D"] as const).map(opt => {
                      const isSelected = answers[q.id] === opt;
                      const isCorrect = opt === q.correct_answer;
                      const isWrong = submitted && isSelected && !isCorrect;
                      const showCorrect = submitted && isCorrect;
                      return (
                        <button key={opt} onClick={() => handleAnswer(q.id, opt)}
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
  );
}
