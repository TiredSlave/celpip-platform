"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { finishMockPracticePart, parseMockPracticeParams, remainingMockSeconds } from "../../../lib/mock-test-practice";
import { formatMockTime } from "../../../lib/mock-test-times";
import { storeResultsReturn, taskReturnHref } from "../../../lib/practice-navigation";
import { navigatePracticeTask } from "../../../lib/practice-task-nav";
import { usePracticeTaskSiblings } from "../../../lib/use-practice-task-siblings";
import { PracticeTaskTypeDropdown } from "../../../components/PracticeTaskTypeDropdown";
import { speakingTask34LearnerPrompt } from "../../../lib/speaking-task34-requirement";
import { task5OptionImageUrl } from "../../../lib/speaking-task5-ui";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const listReturnHref = taskReturnHref(searchParams, "/practice/speaking");
  const mockParams = parseMockPracticeParams(searchParams);
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
  const [mockTimeLeft, setMockTimeLeft] = useState<number | null>(null);
  const mockExpiredRef = useRef(false);
  const taskSiblings = usePracticeTaskSiblings(
    "speaking",
    taskId,
    task?.task_type,
  );

  useEffect(() => { loadTask(); }, [taskId]);

  useEffect(() => {
    if (!mockParams) return;
    const tick = () => {
      const left = remainingMockSeconds();
      if (left === null) return;
      setMockTimeLeft(left);
      if (left <= 0 && !mockExpiredRef.current && phase === "recording") {
        mockExpiredRef.current = true;
        stopRecording();
        setPhase("processing");
        void submitAudio();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mockParams, phase]);

  useEffect(() => {
    if (!task || phase !== "idle") return;
    const timer = setTimeout(() => {
      startPreparation();
    }, 500);
    return () => clearTimeout(timer);
  }, [task]);

  async function loadTask() {
    setLoading(true);
    setPhase("idle");
    setEvaluation(null);
    setTranscript("");
    setSelectedOption(null);
    selectedOptionRef.current = null;
    setError("");
    setShowEvalBtn(false);
    if (taskId) {
      const { data } = await supabase.from("admin_tasks").select("*").eq("id", taskId).single();
      setTask(data || null);
    } else {
      setTask(null);
    }
    setLoading(false);
  }

  function startPreparation() {
    if (!task) return;
    setPhase("preparing");
    setError("");
    const prepTime = task.content.preparation_time_seconds || 30;
    setPrepTimeLeft(prepTime);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setPrepTimeLeft(prev => {
          if (prev <= 1) {
          clearInterval(timerRef.current!);
          const requiresChoice = task.content.task_number === 5 || task.content.task_number === 6;
          if (requiresChoice && !selectedOptionRef.current) {
            setError("Please choose Option A or Option B before recording.");
            return 0;
          }
          void startRecording();
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
      let taskPrompt =
        speakingTask34LearnerPrompt(
          task.content.task_number,
          task.content.prompt,
        ) ||
        task.content.prompt ||
        task.content.situation ||
        "";
      const opt = selectedOptionRef.current;
      if (opt && task.content.task_number === 6) {
        const chosen = opt === "A" ? task.content.option_a : task.content.option_b;
        taskPrompt += "\n\nChose to address: " + chosen?.person + ". Instruction: " + chosen?.instruction;
      } else if (opt && task.content.task_number === 5) {
        const chosen = opt === "A" ? task.content.option_a : task.content.option_b;
        taskPrompt += "\n\nChose: " + chosen?.label + ". Must persuade " + task.content.person_to_persuade;
        if (chosen?.facts?.length) {
          taskPrompt += "\nFacts: " + chosen.facts.slice(0, 5).join(" | ");
        }
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
        if (mockParams) {
          const fin = await finishMockPracticePart(
            mockParams,
            {
              taskId: task.id,
              taskType: task.task_type,
              answers: {},
              score: data.evaluation?.overall_band || 0,
              total: 12,
              feedback: data.evaluation,
              transcript: data.transcript,
              completedAt: new Date().toISOString(),
            },
            session?.access_token || "",
          );
          window.location.href = fin.nextUrl;
          return;
        }
        sessionStorage.setItem("celpip_result", JSON.stringify(result));
        storeResultsReturn(listReturnHref);
        router.push("/practice/results");
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
  const isTask5 = taskNum === 5;
  const learnerPrompt = task
    ? speakingTask34LearnerPrompt(task.content.task_number, task.content.prompt)
    : undefined;
  const needsSinglePicture = taskNum === 3 || taskNum === 4 || taskNum === 8;
  const speakingImageClass = "w-full aspect-square object-cover rounded-lg";

  function singleTaskImage() {
    if (!task?.content.image_url) {
      if (!needsSinglePicture) return null;
      return (
        <div
          className={`${speakingImageClass} mb-4 max-w-lg bg-amber-50 border-2 border-dashed border-amber-300 flex flex-col items-center justify-center text-amber-900 text-sm text-center p-6`}
        >
          <span className="text-2xl mb-2">🖼️</span>
          <span>Picture missing for this task.</span>
          <span className="text-xs mt-1">Ask an admin to regenerate it in Admin → Tasks.</span>
        </div>
      );
    }
    return (
      <img src={task.content.image_url} alt="Task" className={`${speakingImageClass} mb-4 max-w-lg`} />
    );
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!task) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="text-5xl mb-4">📭</div><h2 className="text-xl font-bold text-gray-800 mb-2">Task not found</h2><Link href={listReturnHref} className="text-purple-600 hover:underline">← Back</Link></div></div>;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          <Link href={listReturnHref} className="text-sm text-purple-600 hover:underline shrink-0">← Library</Link>
          <div className="min-w-0">
            <PracticeTaskTypeDropdown
              section="speaking"
              currentLabel={task.task_type}
              currentTaskType={task.task_type}
            />
            {taskSiblings.total > 0 && (
              <p className="text-xs text-gray-500">
                Task {taskSiblings.position} of {taskSiblings.total}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!mockParams && (
            <>
              <button
                type="button"
                onClick={() => taskSiblings.prevId && navigatePracticeTask(router, "speaking", taskSiblings.prevId, listReturnHref)}
                disabled={!taskSiblings.prevId}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 transition"
              >
                PREV
              </button>
              <button
                type="button"
                onClick={() => taskSiblings.nextId && navigatePracticeTask(router, "speaking", taskSiblings.nextId, listReturnHref)}
                disabled={!taskSiblings.nextId}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 transition"
              >
                NEXT
              </button>
            </>
          )}
          {mockParams && mockTimeLeft !== null && (
            <div
              className={`px-3 py-1 rounded-full border-2 font-mono text-sm font-bold ${
                mockTimeLeft < 60
                  ? "border-red-500 text-red-600 bg-red-50"
                  : "border-purple-500 text-purple-600 bg-purple-50"
              }`}
            >
              🕐 {formatMockTime(mockTimeLeft)}
            </div>
          )}
          <span className="text-xs text-gray-600">
            ⏱ {task.content.preparation_time_seconds}s prep · {task.content.speaking_time_seconds}s speak
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          className={`h-full grid grid-cols-1 gap-0 ${
            isTask5 ? "lg:grid-cols-3" : "lg:grid-cols-2"
          }`}
        >
          {/* LEFT: Task content + photos/instructions (Task 5 = 2/3 width) */}
          <div
            className={`overflow-y-auto bg-gray-50 px-6 py-6 lg:px-10 lg:py-8 min-h-0 ${
              isTask5 ? "lg:col-span-2" : ""
            }`}
          >
            {error && <div className="bg-red-50 text-red-600 rounded-lg p-4 text-sm mb-4">❌ {error}</div>}

        {/* PREPARING */}
        {phase === "preparing" && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <p className="text-xs font-bold text-purple-600 uppercase mb-1">Situation</p>
                <p className="text-gray-800">{task.content.situation}</p>
              </div>
              {singleTaskImage()}
              {task.content.image_url_1 && !task.content.option_a && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <img src={task.content.image_url_1} alt="Image 1" className={speakingImageClass} />
                  <img src={task.content.image_url_2} alt="Image 2" className={speakingImageClass} />
                </div>
              )}
              {isTask5 && task.content.option_a && task.content.option_b && (
                <div className="mb-4 space-y-4">
                  <p className="text-sm text-gray-600">Click to select your option. Timer continues.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(["A", "B"] as const).map(opt => {
                      const option = opt === "A" ? task.content.option_a : task.content.option_b;
                      const isSelected = selectedOption === opt;
                      return (
                        <div
                          key={opt}
                          onClick={() => handleSelectOption(opt)}
                          className={`border-2 rounded-xl overflow-hidden cursor-pointer transition ${
                            isSelected
                              ? "border-purple-500 ring-2 ring-purple-200"
                              : "border-gray-200 hover:border-purple-300"
                          }`}
                        >
                          {task5OptionImageUrl(task.content, opt) ? (
                            <img
                              src={task5OptionImageUrl(task.content, opt)}
                              alt={option.label}
                              className={speakingImageClass}
                            />
                          ) : (
                            <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-600 text-sm">
                              🖼 {option?.label}
                            </div>
                          )}
                          <div className="p-3">
                            <p className="font-bold text-gray-800 text-sm">{option?.label}</p>
                            {Array.isArray(option?.facts) &&
                              option.facts.slice(0, 5).map((fact: string, i: number) => (
                                <p key={i} className="text-xs text-gray-600 mt-1">• {fact}</p>
                              ))}
                            {isSelected && (
                              <p className="text-xs text-purple-600 font-bold mt-2">✓ Selected</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {task.content.prompt && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-xs font-bold text-purple-700 mb-1">Instructions</p>
                      <p className="text-sm text-gray-800">{task.content.prompt}</p>
                    </div>
                  )}
                  {task.content.person_to_persuade && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-700">
                        <span className="font-bold">Person to persuade:</span> {task.content.person_to_persuade}
                      </p>
                    </div>
                  )}
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
                          <p className="text-xs text-gray-600 mt-1">{option?.instruction}</p>
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
              {!isTask5 && learnerPrompt && (
                <div className="bg-purple-50 rounded-lg p-4 mt-3">
                  <p className="text-xs font-bold text-purple-700 mb-1">Instructions</p>
                  <p className="text-sm text-gray-800">{learnerPrompt}</p>
                </div>
              )}
              {task.content.tips?.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4 mt-3">
                  <p className="text-xs font-bold text-yellow-700 mb-2">💡 Tips</p>
                  <ul className="space-y-1">{task.content.tips.map((tip,i) => <li key={i} className="text-xs text-yellow-800 flex gap-2"><span>•</span>{tip}</li>)}</ul>
                </div>
              )}
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
              {singleTaskImage()}
              {task.content.image_url_1 && !task.content.option_a && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <img src={task.content.image_url_1} alt="Image 1" className={speakingImageClass} />
                  <img src={task.content.image_url_2} alt="Image 2" className={speakingImageClass} />
                </div>
              )}
              {isTask5 && task.content.option_a && task.content.option_b && (
                <div className="mb-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(["A", "B"] as const).map(opt => {
                      const option = opt === "A" ? task.content.option_a : task.content.option_b;
                      const isSelected = selectedOption === opt;
                      return (
                        <div
                          key={opt}
                          className={`border-2 rounded-xl overflow-hidden ${
                            isSelected ? "border-purple-500" : "border-gray-200 opacity-60"
                          }`}
                        >
                          {task5OptionImageUrl(task.content, opt) ? (
                            <img
                              src={task5OptionImageUrl(task.content, opt)}
                              alt={option.label}
                              className={speakingImageClass}
                            />
                          ) : (
                            <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-600 text-sm">
                              🖼 {option?.label}
                            </div>
                          )}
                          <div className="p-3">
                            <p className="font-bold text-gray-800 text-sm">{option?.label}</p>
                            {isSelected && Array.isArray(option?.facts) && option.facts.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {option.facts.slice(0, 5).map((fact: string, i: number) => (
                                  <p key={i} className="text-[11px] text-gray-600">• {fact}</p>
                                ))}
                              </div>
                            )}
                            {isSelected && <p className="text-xs text-purple-600 font-bold mt-2">✓ Your choice</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {task.content.prompt && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-xs font-bold text-purple-700 mb-1">Instructions</p>
                      <p className="text-sm text-gray-800">{task.content.prompt}</p>
                    </div>
                  )}
                  {task.content.person_to_persuade && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-700">
                        <span className="font-bold">Person to persuade:</span> {task.content.person_to_persuade}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {taskNum === 6 && selectedOption && task.content.option_a && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <p className="text-xs font-bold text-purple-600">Chosen: Option {selectedOption}</p>
                  <p className="text-sm text-gray-700">{selectedOption === "A" ? task.content.option_a?.person : task.content.option_b?.person}</p>
                </div>
              )}
              {!isTask5 && learnerPrompt && (
                <div className="bg-purple-50 rounded-lg p-4 mt-3">
                  <p className="text-xs font-bold text-purple-700 mb-1">Instructions</p>
                  <p className="text-sm text-gray-800">{learnerPrompt}</p>
                </div>
              )}
              {task.content.tips?.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4 mt-3">
                  <p className="text-xs font-bold text-yellow-700 mb-2">💡 Tips</p>
                  <ul className="space-y-1">{task.content.tips.map((tip,i) => <li key={i} className="text-xs text-yellow-800 flex gap-2"><span>•</span>{tip}</li>)}</ul>
                </div>
              )}
            </div>
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
              {learnerPrompt && (
                <div className="bg-purple-50 rounded-lg p-4 mt-3">
                  <p className="text-xs font-bold text-purple-700 mb-1">Instructions</p>
                  <p className="text-sm text-gray-800">{learnerPrompt}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* PROCESSING */}
        {phase === "processing" && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Processing Your Response</h3>
            <p className="text-gray-600">Transcribing and evaluating with AI...</p>
          </div>
        )}

        {/* DONE — results inline */}
        {phase === "done" && evaluation && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-600 mb-2">📝 YOUR RESPONSE</p>
              <p className="text-gray-700 italic text-sm">"{transcript}"</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <p className={`text-7xl font-bold ${getBandColor(evaluation.overall_band)}`}>{evaluation.overall_band}</p>
              <p className="text-gray-600 text-sm mt-1">Overall Band Score / 12</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(evaluation.subscores || {}).map(([key, val]: any) => (
                <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-600 capitalize mb-1">{key.replace(/_/g," ")}</p>
                  <p className={`text-2xl font-bold ${getBandColor(val)}`}>{val}<span className="text-gray-600 text-sm"> /12</span></p>
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
              <Link href={listReturnHref} className="flex-1 text-center bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition">← Back to Library</Link>
            </div>
          </div>
        )}
          </div>

          {/* RIGHT: Controls (Task 5 = 1/3 width) */}
          <div
            className={`overflow-y-auto bg-white border-t lg:border-t-0 lg:border-l border-gray-200 px-6 py-6 lg:px-8 lg:py-8 min-h-0 ${
              isTask5 ? "lg:col-span-1" : ""
            }`}
          >
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-xs font-bold text-purple-700 mb-1">Status</p>
                <p className="text-sm text-gray-700">
                  Phase: <span className="font-semibold">{phase}</span>
                </p>
                {phase === "preparing" && (
                  <p className="text-sm text-gray-700 mt-1">
                    Prep time left: <span className="font-mono font-bold">{prepTimeLeft}s</span>
                  </p>
                )}
                {phase === "recording" && (
                  <p className="text-sm text-gray-700 mt-1">
                    Recording time left: <span className="font-mono font-bold">{recTimeLeft}s</span>
                  </p>
                )}
              </div>

              {phase === "preparing" && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-700 mb-2">Preparation</p>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(prepTimeLeft / (task.content.preparation_time_seconds || 30)) * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const requiresChoice = taskNum === 5 || taskNum === 6;
                      if (requiresChoice && !selectedOptionRef.current) {
                        setError("Please choose Option A or Option B before recording.");
                        return;
                      }
                      if (timerRef.current) clearInterval(timerRef.current);
                      void startRecording();
                    }}
                    className="mt-3 w-full text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition"
                  >
                    Skip → Start Recording
                  </button>
                </div>
              )}

              {phase === "recording" && !showEvalBtn && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                      <p className="text-red-600 font-bold">Recording...</p>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-5 rounded-xl transition text-sm"
                    >
                      ⏹ Stop
                    </button>
                  </div>
                  <div className="w-full bg-red-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${(recTimeLeft / (task.content.speaking_time_seconds || 60)) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {phase === "recording" && showEvalBtn && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                  <p className="text-green-700 font-bold text-center">✅ Recording complete</p>
                  <button
                    onClick={goToEvaluation}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition"
                  >
                    Get Evaluation →
                  </button>
                </div>
              )}

              {(phase === "stopped" || phase === "done") && (
                <button
                  onClick={resetTask}
                  className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl transition"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
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
