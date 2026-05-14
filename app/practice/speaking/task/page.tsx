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
    option_a?: any;
    option_b?: any;
    person_to_persuade?: string;
    scoring_criteria?: Record<string, string>;
    sample_answer?: any;
  };
};

type Phase = "idle" | "preparing" | "recording" | "stopped" | "processing" | "done";

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
  const [error, setError] = useState("");
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | null>(null);
  const [showEvalBtn, setShowEvalBtn] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const selectedOptionRef = useRef<"A" | "B" | null>(null);

  useEffect(() => { loadTask(); }, [taskId]);

  useEffect(() => {
    if (!task || phase !== "idle") return;
    const timer = setTimeout(() => {
      startPreparation();
    }, 500);
    return () => clearTimeout(timer);
  }, [task]);

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
    const prepTime = task.content.preparation_time_seconds || 30;
    setPrepTimeLeft(prepTime);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setPrepTimeLeft(prev => {
          if (prev <= 1) {
          clearInterval(timerRef.current!);
          if ((task.content.task_number === 5 || task.content.task_number === 6) && !selectedOptionRef.current) {
            selectedOptionRef.current = "A";
            setSelectedOption("A");
          }
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleSelectOption(opt: "A" | "B") {
    selectedOptionRef.current = opt;
    setSelectedOption(opt);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.start(100);
      setPhase("recording");
      if (!task) return;
      const speakTime = task.content.speaking_time_seconds || 60;
      let timeLeft = speakTime;
      setRecTimeLeft(speakTime);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        timeLeft -= 1;
        setRecTimeLeft(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timerRef.current!);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
          }
          setShowEvalBtn(true);
        }
      }, 1000);
    } catch {
      setError("Could not access microphone. Please allow microphone access.");
      setPhase("idle");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setShowEvalBtn(true);
  }

  function goToEvaluation() {
    setPhase("processing");
    submitAudio();
  }

  async function submitAudio() {
    if (!task) return;
    try {
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      let taskPrompt = task.content.prompt || task.content.situation || "";
      const opt = selectedOptionRef.current;
      if (opt && task.content.task_number === 6) {
        const chosen = opt === "A" ? task.content.option_a : task.content.option_b;
        taskPrompt += "\n\nChose to address: " + chosen?.person + ". Instruction: " + chosen?.instruction;
      } else if (opt && task.content.task_number === 5) {
        const chosen = opt === "A" ? task.content.option_a : task.content.option_b;
        taskPrompt += "\n\nChose: " + chosen?.label + ". Must persuade " + task.content.person_to_persuade;
      }
      formData.append("taskPrompt", taskPrompt);
      formData.append("taskNumber", String(task.content.task_number));
      formData.append("userId", session?.user?.id || "");
      formData.append("token", session?.access_token || "");
      const res = await fetch("/api/speaking/evaluate", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) { setError(data.error); setPhase("stopped"); }
      else {
        const result = {
          taskId: task.id, taskType: task.task_type,
          score: data.evaluation?.overall_band || 0, total: 12,
          answers: {}, questions: [],
          feedback: data.evaluation, transcript: data.transcript, isSpeaking: true,
        };
        sessionStorage.setItem("celpip_result", JSON.stringify(result));
        window.location.href = "/practice/results";
      }
    } catch {
      setError("Failed to evaluate. Please try again.");
      setPhase("stopped");
    }
  }

  function resetTask() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("idle"); setError(""); setSelectedOption(null); setEvaluation(null); setTranscript(""); setShowEvalBtn(false);
    selectedOptionRef.current = null; setPrepTimeLeft(0); setRecTimeLeft(0); chunksRef.current = [];
  }

  const taskNum = task?.content.task_number;

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!task) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="text-5xl mb-4">📭</div><h2 className="text-xl font-bold text-gray-800 mb-2">Task not found</h2><Link href="/practice/speaking" className="text-purple-600 hover:underline">← Back</Link></div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <Link href="/practice/speaking" className="text-sm text-purple-600 hover:underline">← Speaking Practice</Link>
          <h1 className="text-lg font-bold text-gray-900">Speaking {task.content.task_type}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${task.difficulty === "hard" ? "bg-red-100 text-red-700" : task.difficulty === "easy" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{task.difficulty}</span>
          <span className="text-xs text-gray-500">⏱ {task.content.preparation_time_seconds}s prep · {task.content.speaking_time_seconds}s speak</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        {error && <div className="bg-red-50 text-red-600 rounded-lg p-4 text-sm">❌ {error}</div>}

        {/* PREPARING */}
        {phase === "preparing" && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <p className="text-xs font-bold text-purple-600 uppercase mb-1">Situation</p>
                <p className="text-gray-800">{task.content.situation}</p>
              </div>
              {task.content.image_url && <img src={task.content.image_url} alt="Task" className="w-full rounded-lg mb-4" style={{maxHeight:"300px",objectFit:"cover"}} />}
              {task.content.image_url_1 && !task.content.option_a && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <img src={task.content.image_url_1} alt="Image 1" className="w-full rounded-lg" style={{height:"160px",objectFit:"cover"}} />
                  <img src={task.content.image_url_2} alt="Image 2" className="w-full rounded-lg" style={{height:"160px",objectFit:"cover"}} />
                </div>
              )}
              {taskNum === 5 && task.content.option_a && task.content.option_b && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">Click to select your option. Timer continues.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["A","B"] as const).map(opt => {
                      const option = opt === "A" ? task.content.option_a : task.content.option_b;
                      const isSelected = selectedOption === opt;
                      return (
                        <div key={opt} onClick={() => handleSelectOption(opt)}
                          className={`border-2 rounded-xl overflow-hidden cursor-pointer transition ${isSelected ? "border-purple-500 ring-2 ring-purple-200" : "border-gray-200 hover:border-purple-300"}`}>
                          {option?.image_url ? <img src={option.image_url} alt={option.label} className="w-full h-32 object-cover" /> : <div className="bg-gray-100 h-32 flex items-center justify-center text-gray-400 text-sm">🖼 {option?.label}</div>}
                          <div className="p-2">
                            <p className="font-bold text-gray-800 text-xs">{option?.label}</p>
                            {option?.details && Object.entries(option.details).slice(0,3).map(([k,v]) => <p key={k} className="text-xs text-gray-500">• {v as string}</p>)}
                            {isSelected && <p className="text-xs text-purple-600 font-bold mt-1">✓ Selected</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {taskNum === 6 && task.content.option_a && task.content.option_b && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">Choose ONE person to address. Preparation timer is running.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["A","B"] as const).map(opt => {
                      const option = opt === "A" ? task.content.option_a : task.content.option_b;
                      const isSelected = selectedOption === opt;
                      return (
                        <button key={opt} type="button" onClick={() => handleSelectOption(opt)}
                          className={`p-4 rounded-xl border-2 text-left transition ${isSelected ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200" : "border-gray-200 hover:border-purple-300"}`}>
                          <p className="text-xs font-bold text-purple-600 mb-1">Option {opt}</p>
                          <p className="text-sm font-semibold text-gray-800">{option?.person}</p>
                          <p className="text-xs text-gray-500 mt-1">{option?.instruction}</p>
                          {isSelected && <p className="text-xs text-purple-600 font-bold mt-2">✓ Selected</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {taskNum === 6 && selectedOption && task.content.option_a && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <p className="text-xs font-bold text-purple-600">Chosen: Option {selectedOption}</p>
                  <p className="text-sm text-gray-700">{selectedOption === "A" ? task.content.option_a?.person : task.content.option_b?.person}</p>
                </div>
              )}
              {task.content.prompt && <p className="text-sm font-medium text-gray-800">{task.content.prompt}</p>}
              {task.content.tips?.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4 mt-3">
                  <p className="text-xs font-bold text-yellow-700 mb-2">💡 Tips</p>
                  <ul className="space-y-1">{task.content.tips.map((tip,i) => <li key={i} className="text-xs text-yellow-800 flex gap-2"><span>•</span>{tip}</li>)}</ul>
                </div>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold text-sm">⏱ Preparation</span>
                  <span className="text-blue-600 font-mono font-bold">{prepTimeLeft}s</span>
                </div>
                <button onClick={() => { if(timerRef.current) clearInterval(timerRef.current); startRecording(); }}
                  className="text-xs text-blue-600 border border-blue-300 px-3 py-1 rounded-lg hover:bg-blue-100 transition">
                  Skip → Start Recording
                </button>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{width:`${(prepTimeLeft/(task.content.preparation_time_seconds||30))*100}%`}} />
              </div>
            </div>
          </>
        )}

        {/* RECORDING — same content as preparing, just replace timer bar */}
        {phase === "recording" && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <p className="text-xs font-bold text-purple-600 uppercase mb-1">Situation</p>
                <p className="text-gray-800">{task.content.situation}</p>
              </div>
              {task.content.image_url && <img src={task.content.image_url} alt="Task" className="w-full rounded-lg mb-4" style={{maxHeight:"300px",objectFit:"cover"}} />}
              {task.content.image_url_1 && !task.content.option_a && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <img src={task.content.image_url_1} alt="Image 1" className="w-full rounded-lg" style={{height:"160px",objectFit:"cover"}} />
                  <img src={task.content.image_url_2} alt="Image 2" className="w-full rounded-lg" style={{height:"160px",objectFit:"cover"}} />
                </div>
              )}
              {taskNum === 5 && task.content.option_a && task.content.option_b && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {(["A","B"] as const).map(opt => {
                    const option = opt === "A" ? task.content.option_a : task.content.option_b;
                    const isSelected = selectedOption === opt;
                    return (
                      <div key={opt} className={`border-2 rounded-xl overflow-hidden ${isSelected ? "border-purple-500" : "border-gray-200 opacity-60"}`}>
                        {option?.image_url ? <img src={option.image_url} alt={option.label} className="w-full h-28 object-cover" /> : <div className="bg-gray-100 h-28 flex items-center justify-center text-gray-400 text-sm">🖼 {option?.label}</div>}
                        <div className="p-2">
                          <p className="font-bold text-gray-800 text-xs">{option?.label}</p>
                          {isSelected && <p className="text-xs text-purple-600 font-bold">✓ Your choice</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {taskNum === 6 && selectedOption && task.content.option_a && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <p className="text-xs font-bold text-purple-600">Chosen: Option {selectedOption}</p>
                  <p className="text-sm text-gray-700">{selectedOption === "A" ? task.content.option_a?.person : task.content.option_b?.person}</p>
                </div>
              )}
              {task.content.prompt && <p className="text-sm font-medium text-gray-800">{task.content.prompt}</p>}
              {task.content.tips?.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4 mt-3">
                  <p className="text-xs font-bold text-yellow-700 mb-2">💡 Tips</p>
                  <ul className="space-y-1">{task.content.tips.map((tip,i) => <li key={i} className="text-xs text-yellow-800 flex gap-2"><span>•</span>{tip}</li>)}</ul>
                </div>
              )}
            </div>
            {!showEvalBtn && <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                  <p className="text-red-600 font-bold">Recording...</p>
                  <span className="text-red-600 font-mono font-bold">{recTimeLeft}s</span>
                </div>
                <button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-5 rounded-xl transition text-sm">⏹ Stop</button>
              </div>
              <div className="w-full bg-red-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full transition-all" style={{width:`${(recTimeLeft/(task.content.speaking_time_seconds||60))*100}%`}} />
              </div>
              <p className="text-xs text-red-400 mt-2">Speak clearly • Click Stop when finished or wait for timer</p>
            </div>}
            {showEvalBtn && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                <p className="text-green-700 font-bold text-center">✅ Recording complete</p>
                <button onClick={goToEvaluation} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition">Get Evaluation →</button>

              </div>
            )}
          </>
        )}

        {/* STOPPED */}
        {phase === "stopped" && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <p className="text-xs font-bold text-purple-600 uppercase mb-1">Situation</p>
                <p className="text-gray-800">{task.content.situation}</p>
              </div>
              {task.content.prompt && <p className="text-sm font-medium text-gray-800">{task.content.prompt}</p>}
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
              <p className="text-green-700 font-bold text-center">✅ Recording complete</p>
              <button onClick={goToEvaluation} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition">Get Evaluation →</button>
              <button onClick={resetTask} className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition">🔄 Re-record</button>
            </div>
          </>
        )}

        {/* PROCESSING */}
        {phase === "processing" && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Processing Your Response</h3>
            <p className="text-gray-500">Transcribing and evaluating with AI...</p>
          </div>
        )}

        {/* DONE — results inline */}
        {phase === "done" && evaluation && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 mb-2">📝 YOUR RESPONSE</p>
              <p className="text-gray-700 italic text-sm">"{transcript}"</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <p className={`text-7xl font-bold ${getBandColor(evaluation.overall_band)}`}>{evaluation.overall_band}</p>
              <p className="text-gray-400 text-sm mt-1">Overall Band Score / 12</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(evaluation.subscores || {}).map(([key, val]: any) => (
                <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 capitalize mb-1">{key.replace(/_/g," ")}</p>
                  <p className={`text-2xl font-bold ${getBandColor(val)}`}>{val}<span className="text-gray-400 text-sm"> /12</span></p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="font-semibold text-green-700 mb-3">✅ Strengths</h4>
              <ul className="space-y-2">{evaluation.strengths?.map((s:string,i:number) => <li key={i} className="bg-green-50 text-green-800 rounded-lg p-3 text-sm">{s}</li>)}</ul>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="font-semibold text-orange-700 mb-3">📈 Areas to Improve</h4>
              <ul className="space-y-2">{evaluation.areas_to_improve?.map((s:string,i:number) => <li key={i} className="bg-orange-50 text-orange-800 rounded-lg p-3 text-sm">{s}</li>)}</ul>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="font-semibold text-gray-700 mb-2">💬 Detailed Feedback</h4>
              <p className="bg-gray-50 rounded-lg p-4 text-gray-700 text-sm">{evaluation.detailed_feedback}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="font-semibold text-purple-700 mb-2">✨ Sample Improved Response</h4>
              <p className="bg-purple-50 rounded-lg p-4 text-purple-800 text-sm italic">{evaluation.sample_improved_response}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={resetTask} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition">🔄 Try Again</button>
              <Link href="/practice/speaking" className="flex-1 text-center bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition">← Back to Library</Link>
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
