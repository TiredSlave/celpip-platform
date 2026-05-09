"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type SpeakingTask = {
  id: string;
  task_type: string;
  difficulty: string;
  content: {
    task_number: number;
    task_type: string;
    situation: string;
    prompt?: string;
    preparation_time_seconds: number;
    speaking_time_seconds: number;
    tips: string[];
    image_url?: string;
    image_url_1?: string;
    image_url_2?: string;
    option_a?: { person: string; instruction: string };
    option_b?: { person: string; instruction: string };
    scoring_criteria?: Record<string, string>;
    sample_answer?: any;
  };
};

type Phase = "idle" | "preparing" | "recording" | "processing" | "done";

type Evaluation = {
  overall_band: number;
  subscores: Record<string, number>;
  strengths: string[];
  areas_to_improve: string[];
  detailed_feedback: string;
  sample_improved_response: string;
};

function getBandColor(band: number) {
  if (band >= 9) return "text-green-600";
  if (band >= 7) return "text-blue-600";
  if (band >= 5) return "text-yellow-600";
  return "text-red-600";
}

function SpeakingContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [task, setTask] = useState<SpeakingTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [prepTimeLeft, setPrepTimeLeft] = useState(0);
  const [recTimeLeft, setRecTimeLeft] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState("");
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | null>(null);
  const [selectionTimeLeft, setSelectionTimeLeft] = useState(0);
  const [selectingPhase, setSelectingPhase] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { loadTask(); }, [taskId]);

  // Auto-start for tasks
  useEffect(() => {
    if (!task) return;
    const num = task.content.task_number;
    if (num === 5) {
      // Task 5: start 60s selection timer
      startSelectionTimer();
    } else if (num !== 6) {
      // All other tasks except 6: auto-start prep
      startPreparation();
    }
  }, [task]);

  function startSelectionTimer() {
    if (!task) return;
    setSelectingPhase(true);
    setSelectionTimeLeft(task.content.selection_time_seconds || 60);
    timerRef.current = setInterval(() => {
      setSelectionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-assign Option A if nothing selected
          setSelectedOption(s => s || "A");
          setSelectingPhase(false);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleSelectOption(opt: "A" | "B") {
    setSelectedOption(opt);
    setSelectingPhase(false);
    if (timerRef.current) clearInterval(timerRef.current);
    // Start recording immediately after selection
    startRecording();
  }

  async function loadTask() {
    setLoading(true);
    if (taskId) {
      const { data } = await supabase.from("admin_tasks").select("*").eq("id", taskId).single();
      setTask(data || null);
    }
    setLoading(false);
  }

  function startPreparation() {
    if (!task) return;
    setPhase("preparing");
    setPrepTimeLeft(task.content.preparation_time_seconds);
    timerRef.current = setInterval(() => {
      setPrepTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); startRecording(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.start();
      setPhase("recording");
      if (!task) return;
      setRecTimeLeft(task.content.speaking_time_seconds);
      timerRef.current = setInterval(() => {
        setRecTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current!); stopRecording(); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError("Could not access microphone. Please allow microphone access.");
      setPhase("idle");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && phase === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current.onstop = () => submitAudio();
      setPhase("processing");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  async function submitAudio() {
    if (!task) return;
    try {
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("taskPrompt", task.content.prompt || task.content.situation);
      formData.append("taskNumber", String(task.content.task_number));
      formData.append("userId", session?.user?.id || "");
      formData.append("token", session?.access_token || "");
      const res = await fetch("/api/speaking/evaluate", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) { setError(data.error); setPhase("idle"); }
      else { setTranscript(data.transcript); setEvaluation(data.evaluation); setPhase("done"); }
    } catch {
      setError("Failed to evaluate. Please try again.");
      setPhase("idle");
    }
  }

  function resetTask() {
    setPhase("idle");
    setEvaluation(null);
    setTranscript("");
    setError("");
    setSelectedOption(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  const taskNum = task?.content.task_number;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!task) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">📭</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Task not found</h2>
        <Link href="/practice/speaking" className="text-purple-600 hover:underline">← Back to Speaking Practice</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <Link href="/practice/speaking" className="text-sm text-purple-600 hover:underline">← Speaking Practice</Link>
          <h1 className="text-lg font-bold text-gray-900">Speaking {task.content.task_type}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            task.difficulty === "hard" ? "bg-red-100 text-red-700"
            : task.difficulty === "easy" ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
          }`}>{task.difficulty}</span>
          <span className="text-xs text-gray-500">
            ⏱ {task.content.preparation_time_seconds}s prep · {task.content.speaking_time_seconds}s speak
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {error && (
          <div className="bg-red-50 text-red-600 rounded-lg p-4 text-sm">❌ {error}</div>
        )}

        {/* IDLE — Show task */}
        {phase === "idle" && (
          <>
            {/* Situation */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <p className="text-xs font-bold text-purple-600 uppercase mb-1">Situation</p>
                <p className="text-gray-800">{task.content.situation}</p>
              </div>

              {/* Task 3 — Single image */}
              {task.content.image_url && (
                <img src={task.content.image_url} alt="Task" className="w-full rounded-lg mb-4" style={{maxHeight:"350px", objectFit:"cover"}} />
              )}

              {/* Task 5 — Two options with selection */}
              {task.content.option_a && task.content.option_b && (
                <div className="space-y-4 mb-4">
                  {/* Selection timer */}
                  {selectingPhase && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <p className="text-blue-600 font-bold text-sm mb-1">⏱ Choose your option</p>
                      <p className="text-4xl font-bold text-blue-600 font-mono">{selectionTimeLeft}</p>
                      <p className="text-xs text-blue-500 mt-1">Recording starts automatically after selection or when timer ends</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {(["A","B"] as const).map(opt => {
                      const option = opt === "A" ? task.content.option_a : task.content.option_b;
                      const isSelected = selectedOption === opt;
                      return (
                        <div key={opt} className={`border-2 rounded-xl overflow-hidden transition ${
                          isSelected ? "border-purple-500" : "border-gray-200"
                        }`}>
                          {/* Image placeholder */}
                          <div className="bg-gray-100 h-36 flex items-center justify-center text-gray-400 text-sm">
                            🖼 {option?.label}
                          </div>
                          {/* Details */}
                          <div className="p-3">
                            <p className="font-bold text-gray-800 text-sm mb-2">{option?.label}</p>
                            {option?.details && Object.entries(option.details).map(([k, v]) => (
                              <p key={k} className="text-xs text-gray-600">• {v as string}</p>
                            ))}
                          </div>
                          {selectingPhase && (
                            <button onClick={() => handleSelectOption(opt)}
                              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition">
                              Choose This Option
                            </button>
                          )}
                          {isSelected && !selectingPhase && (
                            <div className="w-full py-2 bg-purple-100 text-purple-700 text-sm font-bold text-center">
                              ✓ Your Choice
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Old image format fallback */}
              {task.content.image_url_1 && !task.content.option_a && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1 text-center">Picture 1</p>
                    <img src={task.content.image_url_1} alt="Image 1" className="w-full rounded-lg" style={{height:"200px", objectFit:"cover"}} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1 text-center">Picture 2</p>
                    <img src={task.content.image_url_2} alt="Image 2" className="w-full rounded-lg" style={{height:"200px", objectFit:"cover"}} />
                  </div>
                </div>
              )}

              {/* Task 6 — Two options */}
              {task.content.option_a && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Choose ONE person to address:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["A","B"] as const).map(opt => {
                      const option = opt === "A" ? task.content.option_a : task.content.option_b;
                      return (
                        <button key={opt} onClick={() => setSelectedOption(opt)}
                          className={`p-4 rounded-xl border-2 text-left transition ${
                            selectedOption === opt ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-300"
                          }`}>
                          <p className="text-xs font-bold text-purple-600 mb-1">Option {opt}</p>
                          <p className="text-sm font-semibold text-gray-800">{option?.person}</p>
                          <p className="text-xs text-gray-500 mt-1">{option?.instruction}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prompt */}
              {task.content.prompt && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Your Task</p>
                  <p className="text-gray-800 font-medium">{task.content.prompt}</p>
                </div>
              )}

              {/* Tips */}
              {task.content.tips?.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                  <p className="text-xs font-bold text-yellow-700 mb-2">💡 Tips</p>
                  <ul className="space-y-1">
                    {task.content.tips.map((tip, i) => (
                      <li key={i} className="text-xs text-yellow-800 flex gap-2">
                        <span>•</span>{tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {taskNum === 6 && !selectedOption ? (
              <p className="text-center text-sm text-purple-600 font-medium">👆 Select an option above to begin</p>
            ) : (
              <button onClick={startPreparation}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition">
                ▶ Start Preparation Time
              </button>
            )}
            </div>
          </>
        )}

        {/* PREPARING */}
        {phase === "preparing" && (
          <>
            {/* Task info still visible during prep */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <p className="text-xs font-bold text-purple-600 uppercase mb-1">Situation</p>
                <p className="text-gray-800">{task.content.situation}</p>
              </div>
              {task.content.image_url && (
                <img src={task.content.image_url} alt="Task" className="w-full rounded-lg mb-4" style={{maxHeight:"300px", objectFit:"cover"}} />
              )}
              {task.content.image_url_1 && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <img src={task.content.image_url_1} alt="Image 1" className="w-full rounded-lg" style={{height:"180px", objectFit:"cover"}} />
                  <img src={task.content.image_url_2} alt="Image 2" className="w-full rounded-lg" style={{height:"180px", objectFit:"cover"}} />
                </div>
              )}
              {task.content.option_a && selectedOption && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <p className="text-xs font-bold text-purple-600 mb-1">Option {selectedOption}</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedOption === "A" ? task.content.option_a?.person : task.content.option_b?.person}</p>
                  <p className="text-xs text-gray-600 mt-1">{selectedOption === "A" ? task.content.option_a?.instruction : task.content.option_b?.instruction}</p>
                </div>
              )}
              {task.content.prompt && (
                <p className="text-sm font-medium text-gray-800 mb-4">{task.content.prompt}</p>
              )}
            </div>
            {/* Prep timer overlay at bottom */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
              <p className="text-blue-600 font-bold mb-1">⏱ Preparation Time</p>
              <p className="text-7xl font-bold text-blue-600 font-mono">{prepTimeLeft}</p>
              <p className="text-sm text-blue-500 mt-2">Recording will start automatically</p>
            </div>
          </>
        )}

        {/* RECORDING */}
        {phase === "recording" && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <p className="text-red-500 font-bold text-lg">Recording...</p>
            </div>
            <p className="text-9xl font-bold text-red-600 font-mono mb-4">{recTimeLeft}</p>
            <p className="text-gray-500 mb-6">Speak clearly into your microphone</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-700">{task.content.prompt || task.content.situation}</p>
            </div>
            <button onClick={stopRecording}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-8 rounded-xl transition">
              ⏹ Stop Recording Early
            </button>
          </div>
        )}

        {/* PROCESSING */}
        {phase === "processing" && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Processing Your Response</h3>
            <p className="text-gray-500">Transcribing and evaluating with AI...</p>
          </div>
        )}

        {/* DONE — Results */}
        {phase === "done" && evaluation && (
          <div className="space-y-4">
            {/* Transcript */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-800 mb-2">📝 Your Response</h3>
              <p className="text-gray-700 italic bg-gray-50 rounded-lg p-4">"{transcript}"</p>
            </div>

            {/* Score */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <p className={`text-7xl font-bold ${getBandColor(evaluation.overall_band)}`}>
                {evaluation.overall_band}
              </p>
              <p className="text-gray-400 text-sm mt-1">Overall Band Score</p>
            </div>

            {/* Subscores */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(evaluation.subscores).map(([key, val]) => (
                <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 capitalize mb-1">{key.replace(/_/g," ")}</p>
                  <p className={`text-2xl font-bold ${getBandColor(val)}`}>{val}<span className="text-gray-400 text-sm font-normal"> /12</span></p>
                </div>
              ))}
            </div>

            {/* Strengths */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="font-semibold text-green-700 mb-3">✅ Strengths</h4>
              <ul className="space-y-2">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="bg-green-50 text-green-800 rounded-lg p-3 text-sm">{s}</li>
                ))}
              </ul>
            </div>

            {/* Areas to improve */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="font-semibold text-orange-700 mb-3">📈 Areas to Improve</h4>
              <ul className="space-y-2">
                {evaluation.areas_to_improve.map((s, i) => (
                  <li key={i} className="bg-orange-50 text-orange-800 rounded-lg p-3 text-sm">{s}</li>
                ))}
              </ul>
            </div>

            {/* Detailed feedback */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="font-semibold text-gray-700 mb-2">💬 Detailed Feedback</h4>
              <p className="bg-gray-50 rounded-lg p-4 text-gray-700 text-sm leading-relaxed">{evaluation.detailed_feedback}</p>
            </div>

            {/* Sample response */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="font-semibold text-purple-700 mb-2">✨ Sample Improved Response</h4>
              <p className="bg-purple-50 rounded-lg p-4 text-purple-800 text-sm italic leading-relaxed">{evaluation.sample_improved_response}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={resetTask}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition">
                🔄 Try Again
              </button>
              <Link href="/practice/speaking"
                className="flex-1 text-center bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition">
                ← Back to Library
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SpeakingTaskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <SpeakingContent />
    </Suspense>
  );
}
