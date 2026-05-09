"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../lib/supabase";

type WritingTask = {
  id: string;
  task_type: string;
  content: {
    scenario: string;
    instructions: string;
    bullet_points: string[];
    word_limit: number;
    time_limit_minutes: number;
    sample_answer?: string;
    sample_answer_band?: number;
    sample_answer_notes?: string[];
  };
};

const WRITING_PARTS = [
  { key: "Writing Task 1", label: "Task 1", title: "Writing an Email", timeMinutes: 27 },
  { key: "Writing Task 2", label: "Task 2", title: "Responding to Survey Questions", timeMinutes: 26 },
];

export default function WritingPage() {
  const [tasks, setTasks] = useState<WritingTask[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentTask, setCurrentTask] = useState<WritingTask | null>(null);
  const [response, setResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(27 * 60);
  const [paused, setPaused] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { loadTasks(); }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      const part = WRITING_PARTS[currentPartIndex];
      const found = tasks.find(t => t.task_type === part.key);
      setCurrentTask(found || null);
      setResponse("");
      setSubmitted(false);
      setFeedback(null);
      setShowSample(false);
      setTimeLeft(part.timeMinutes * 60);
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
  }, [loading, paused, submitted, currentPartIndex]);

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase
      .from("admin_tasks")
      .select("*")
      .in("task_type", WRITING_PARTS.map(p => p.key))
      .order("created_at", { ascending: false });
    const latest: Record<string, WritingTask> = {};
    (data || []).forEach((t: WritingTask) => { if (!latest[t.task_type]) latest[t.task_type] = t; });
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
    setEvaluating(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const res = await fetch("/api/writing/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: currentTask.task_type,
          scenario: currentTask.content.scenario,
          bulletPoints: currentTask.content.bullet_points,
          response,
        }),
      });
      const data = await res.json();
      setFeedback(data);
    } catch {
      setFeedback({ error: "Could not evaluate. Please try again." });
    }
    setEvaluating(false);
  }

  const currentPart = WRITING_PARTS[currentPartIndex];
  const wordCount = countWords(response);
  const wordLimit = currentTask?.content.word_limit || 200;
  const isOverLimit = wordCount > wordLimit;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading writing tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-800">Writing — {currentPart.label}</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">{currentPart.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPartIndex(0)} disabled={currentPartIndex === 0}
            className="text-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 font-medium transition">PREV</button>
          <select value={currentPartIndex} onChange={e => setCurrentPartIndex(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
            {WRITING_PARTS.map((p, i) => (
              <option key={p.key} value={i}>{p.label} — {p.title}</option>
            ))}
          </select>
          <button onClick={() => setCurrentPartIndex(1)} disabled={currentPartIndex === 1}
            className="text-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 font-medium transition">NEXT</button>
        </div>
      </div>

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

          {/* LEFT — Task Info */}
          <div className="w-2/5 border-r border-gray-300 overflow-y-auto bg-white p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Read the below Information:</h2>
            <p className="text-gray-700 text-sm leading-relaxed mb-6">{currentTask.content.scenario}</p>
            <hr className="border-gray-200 mb-5" />
            <div className="space-y-3">
              {currentTask.content.bullet_points?.map((point, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-bold text-blue-700 mb-2">📝 Tips</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Write between 150–{wordLimit} words</li>
                <li>• Address ALL bullet points</li>
                <li>• Use appropriate tone for the task</li>
                <li>• Include proper greeting and closing</li>
              </ul>
            </div>
            {submitted && currentTask.content.sample_answer && (
              <div className="mt-6">
                <button onClick={() => setShowSample(s => !s)}
                  className="text-sm text-blue-600 font-semibold hover:underline">
                  {showSample ? "Hide" : "Show"} Sample Answer (Band {currentTask.content.sample_answer_band})
                </button>
                {showSample && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {currentTask.content.sample_answer}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT — Writing Area */}
          <div className="w-3/5 flex flex-col bg-gray-50">
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border-2 font-mono font-bold text-sm ${
                timeLeft < 300 ? "border-red-500 text-red-600 bg-red-50" : "border-blue-500 text-blue-600 bg-blue-50"
              }`}>
                🕐 Time remaining: {formatTime(timeLeft)}
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-semibold ${isOverLimit ? "text-red-600" : "text-gray-500"}`}>
                  Words: {wordCount}
                </span>
                <button onClick={() => setPaused(p => !p)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                  {paused ? "Resume" : "Pause"}
                </button>
                <button onClick={handleSubmit} disabled={evaluating || !response.trim()}
                  className="px-5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition disabled:opacity-50">
                  {evaluating ? "⏳ Evaluating..." : "EVALUATE"}
                </button>
              </div>
            </div>
            <div className="flex-1 p-6">
              <textarea
                value={response}
                onChange={e => setResponse(e.target.value)}
                disabled={evaluating}
                placeholder="Type your response here..."
                spellCheck={true}
                lang="en-CA"
                autoCorrect="off"
                autoCapitalize="sentences"
                className="w-full h-full resize-none bg-white border border-gray-200 rounded-xl p-5 text-gray-800 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50"
              />
            </div>
            {feedback && (
              <div className="border-t border-gray-200 bg-white p-6 max-h-72 overflow-y-auto">
                {feedback.error ? (
                  <p className="text-red-600 text-sm">{feedback.error}</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-gray-800">AI Feedback</h3>
                      {feedback.band && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">Band {feedback.band}</span>
                      )}
                    </div>
                    {feedback.overall && <p className="text-sm text-gray-700">{feedback.overall}</p>}
                    {feedback.criteria && (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(feedback.criteria).map(([key, val]: any) => (
                          <div key={key} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-600 capitalize mb-1">{key.replace(/_/g, " ")}</p>
                            <p className="text-xs text-gray-600">{val}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {feedback.improvements && (
                      <div>
                        <p className="text-xs font-bold text-gray-700 mb-1">Improvements:</p>
                        <ul className="space-y-1">
                          {feedback.improvements.map((imp: string, i: number) => (
                            <li key={i} className="text-xs text-gray-600 flex gap-2">
                              <span className="text-orange-500">→</span>{imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
