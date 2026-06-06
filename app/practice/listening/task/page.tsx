"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { storeResultsReturn, taskReturnHref } from "../../../lib/practice-navigation";
import { navigatePracticeTask } from "../../../lib/practice-task-nav";
import { usePracticeTaskSiblings } from "../../../lib/use-practice-task-siblings";
import { PracticeTaskTypeDropdown } from "../../../components/PracticeTaskTypeDropdown";
import { finishMockPracticePart, parseMockPracticeParams, remainingMockSeconds } from "../../../lib/mock-test-practice";
import { formatMockTime, formatPracticeTime } from "../../../lib/mock-test-times";
import { VocabularySelectableText } from "../../../components/VocabularySelectableText";
declare global { interface Window { __currentAudio?: HTMLAudioElement; } }
type Question = {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  explanation: string;
  option_explanations?: { A: string; B: string; C: string; D: string };
  section?: number;
};

type DialogueLine = { speaker: string; text: string };

type ListeningTask = {
  id: string;
  task_type: string;
  content: {
    topic?: string;
    title: string;
    listening_type: string;
    part_description: string;
    audio_length: string;
    answer_time_seconds?: number;
    dialogue: DialogueLine[];
    questions: Question[];
  };
};

const LISTENING_PARTS = [
  { key: "Listening - Problem Solving",           label: "Task 1", title: "Problem Solving",          onePerPage: true,  hasSections: true,  answerTimeSeconds: 30  },
  { key: "Listening - Daily Life Conversation",   label: "Task 2", title: "Daily Life Conversation",  onePerPage: true,  hasSections: false, answerTimeSeconds: 30  },
  { key: "Listening - Listening for Information", label: "Task 3", title: "Listening for Information", onePerPage: true,  hasSections: false, answerTimeSeconds: 30  },
  { key: "Listening - News Item",                 label: "Task 4", title: "News Item",                onePerPage: false, hasSections: false, answerTimeSeconds: 180 },
  { key: "Listening - Discussion",                label: "Task 5", title: "Discussion",               onePerPage: false, hasSections: false, answerTimeSeconds: 240 },
  { key: "Listening - Viewpoints",                label: "Task 6", title: "Viewpoints",               onePerPage: false, hasSections: false, answerTimeSeconds: 270 },
];

// ── Global audio manager — single instance prevents overlapping ──────────────
const AudioManager = {
  audio: null as HTMLAudioElement | null,
  blobUrl: null as string | null,

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = "";
      this.audio = null;
    }
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  },

  async load(lines: { speaker?: string; text: string }[], listeningType: string, isQuestion = false): Promise<HTMLAudioElement> {
    this.stop(); // always stop previous before loading new
    const res = await fetch("/api/tts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines, listeningType, isQuestion }),
    });
    if (!res.ok) throw new Error("TTS failed");
    const { chunks } = await res.json();

    const silence = new Uint8Array(4000);
    const buffers: Uint8Array[] = [];
    chunks.forEach((b64: string, i: number) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      buffers.push(bytes);
      if (i < chunks.length - 1) buffers.push(silence);
    });

    const total = buffers.reduce((a, b) => a + b.length, 0);
    const combined = new Uint8Array(total);
    let offset = 0;
    buffers.forEach(b => { combined.set(b, offset); offset += b.length; });
    const blob = new Blob([combined], { type: "audio/mpeg" });
    this.blobUrl = URL.createObjectURL(blob);
    this.audio = new Audio(this.blobUrl);
    return this.audio;
  }
};
// ── Global Audio Manager — single instance, no overlapping ──────────────────
const AM = {
  audio: null as HTMLAudioElement | null,
  url: null as string | null,
  loading: false,

  stop() {
    this.loading = false;
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
  },

  async generate(lines: {speaker?:string;text:string}[], type: string, isQ = false): Promise<HTMLAudioElement|null> {
    this.stop();
    this.loading = true;
    try {
      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, listeningType: type, isQuestion: isQ }),
      });
      if (!res.ok || !this.loading) return null;
      const { chunks } = await res.json();
      if (!this.loading) return null;

      const silence = new Uint8Array(3000);
      const bufs: Uint8Array[] = [];
      chunks.forEach((b64: string, i: number) => {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
        bufs.push(bytes);
        if (i < chunks.length - 1) bufs.push(silence);
      });
      const total = bufs.reduce((a, b) => a + b.length, 0);
      const combined = new Uint8Array(total);
      let offset = 0;
      bufs.forEach(b => { combined.set(b, offset); offset += b.length; });
      this.url = URL.createObjectURL(new Blob([combined], { type: "audio/mpeg" }));
      this.audio = new Audio(this.url);
      this.loading = false;
      return this.audio;
    } catch(e) {
      this.loading = false;
      return null;
    }
  }
};

// ── Audio Player Component ────────────────────────────────────────────────────
function AudioPlayer({
  lines, listeningType, cacheKey, isQuestion=false, compact=false,
}: {
  lines: {speaker?:string;text:string}[];
  listeningType: string;
  cacheKey: string;
  isQuestion?: boolean;
  compact?: boolean;
  autoPlay?: boolean;
}) {
  const [state, setState] = useState<"idle"|"loading"|"playing"|"paused"|"error">("idle");
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showRates, setShowRates] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string|null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Auto-play on mount — works because user clicked Next/Previous to get here
    handleGenerate();
    return () => { mountedRef.current = false; AM.stop(); };
  }, []);

  useEffect(() => {
    if (AM.audio) AM.audio.playbackRate = playbackRate;
  }, [playbackRate]);

  function fmt(s: number) {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,"0")}`;
  }

  async function handleGenerate() {
    if (!mountedRef.current) return;
    setState("loading");
    const audio = await AM.generate(lines, listeningType, isQuestion);
    if (!audio || !mountedRef.current) return;
    setBlobUrl(AM.url);
    audio.playbackRate = playbackRate;
    audio.onloadedmetadata = () => { if(mountedRef.current) setDuration(audio.duration); };
    audio.ontimeupdate = () => {
      if(!mountedRef.current) return;
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime/audio.duration)*100 : 0);
    };
    audio.onended = () => { if(mountedRef.current) setState("paused"); };
    audio.onerror = () => { if(mountedRef.current) setState("error"); };
    try {
      await audio.play();
      if(mountedRef.current) setState("playing");
    } catch(e) {
      // Browser blocked autoplay — show play button instead
      if(mountedRef.current) setState("paused");
    }
  }

  function togglePlay() {
    const a = AM.audio;
    if (!a) { handleGenerate(); return; }
    if (state === "playing") { a.pause(); setState("paused"); }
    else { a.play(); setState("playing"); }
  }

  function restart() {
    const a = AM.audio;
    if (!a) { handleGenerate(); return; }
    a.currentTime = 0; a.play(); setState("playing");
  }

  function skipBack() { if(AM.audio) AM.audio.currentTime = Math.max(0, AM.audio.currentTime-10); }
  function skipForward() { if(AM.audio) AM.audio.currentTime = Math.min(duration, AM.audio.currentTime+10); }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if(!AM.audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    AM.audio.currentTime = ((e.clientX-rect.left)/rect.width)*duration;
  }

  function download() {
    if(!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `celpip_${listeningType.replace(/ /g,"_")}${isQuestion?"_q":""}.mp3`;
    a.click();
  }

  const isPlaying = state === "playing";
  const hasAudio = ["playing","paused"].includes(state);

  if (compact) return (
    <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
      <button onClick={togglePlay} disabled={state==="loading"}
        className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-gray-900 hover:bg-gray-100 transition flex-shrink-0 disabled:opacity-50">
        {state==="loading" ? <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin"/>
        : isPlaying ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        : <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5"><path d="M8 5v14l11-7z"/></svg>}
      </button>
      <div className="relative flex-1 h-1.5 bg-gray-600 rounded-full cursor-pointer" onClick={handleSeek}>
        <div className="h-full bg-white rounded-full" style={{width:`${progress}%`}}/>
      </div>
      <button onClick={restart} disabled={!hasAudio} className="text-gray-600 hover:text-white disabled:opacity-30 transition">🔁</button>
      <span className="text-xs text-gray-600 font-mono">{fmt(currentTime)}/{fmt(duration)}</span>
      <span className="text-xs text-gray-600">{state==="loading"?"Loading...":isPlaying?"Playing":state==="idle"?"▶ Listen":"Paused"}</span>
    </div>
  );

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={skipBack} disabled={!hasAudio}
          className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-30 transition rounded-full hover:bg-gray-700" title="Back 10s">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
        </button>
        <button onClick={togglePlay} disabled={state==="loading"}
          className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-900 hover:bg-gray-200 transition shadow-lg flex-shrink-0 disabled:opacity-50">
          {state==="loading" ? <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin"/>
          : isPlaying ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          : <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-0.5"><path d="M8 5v14l11-7z"/></svg>}
        </button>
        <button onClick={skipForward} disabled={!hasAudio}
          className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-30 transition rounded-full hover:bg-gray-700" title="Forward 10s">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"/></svg>
        </button>
        <button onClick={restart}
          className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-white transition rounded-full hover:bg-gray-700" title="Restart">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
        </button>
        <span className="text-xs text-gray-600 font-mono ml-1 flex-shrink-0">{fmt(currentTime)} / {fmt(duration)}</span>
        <div className="flex-1"/>
        <div className="relative">
          <button onClick={()=>setShowRates(s=>!s)}
            className="text-xs text-gray-600 hover:text-white font-bold px-2 py-1 rounded hover:bg-gray-700 transition">
            {playbackRate}x
          </button>
          {showRates && (
            <div className="absolute bottom-full right-0 mb-1 bg-gray-800 rounded-lg overflow-hidden shadow-xl border border-gray-700 z-10">
              {[0.75,0.9,1,1.1,1.25,1.5].map(r=>(
                <button key={r} onClick={()=>{setPlaybackRate(r);setShowRates(false);}}
                  className={`block w-full px-4 py-2 text-xs text-left transition ${playbackRate===r?"bg-blue-600 text-white":"text-gray-300 hover:bg-gray-700"}`}>
                  {r}x {r===1?"(normal)":r<1?"(slower)":"(faster)"}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={download} disabled={!hasAudio}
          className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-30 transition rounded-full hover:bg-gray-700" title="Download MP3">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        </button>
      </div>
      <div className="relative w-full h-2 bg-gray-700 rounded-full cursor-pointer group" onClick={handleSeek}>
        <div className="h-full bg-white rounded-full transition-all" style={{width:`${progress}%`}}/>
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition pointer-events-none"
          style={{left:`calc(${progress}% - 6px)`}}/>
      </div>
      <div className="mt-2 text-xs text-gray-600">
        {state==="loading" && "🎵 Generating audio..."}
        {state==="idle" && "Click ▶ to play"}
        {state==="error" && "❌ Failed — check GOOGLE_TTS_API_KEY"}
        {isPlaying && "🎵 Playing..."}
        {state==="paused" && "⏸ Paused — click ▶ to resume"}
      </div>
    </div>
  );
}


// ── Main Page ─────────────────────────────────────────────────────────────────
function ListeningContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mockParams = parseMockPracticeParams(searchParams);
  const taskId = searchParams.get("taskId");
  const fromLibrary = Boolean(taskId && !mockParams);
  const listReturnHref = taskReturnHref(searchParams, "/practice/listening");

  const [tasks, setTasks] = useState<ListeningTask[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentTask, setCurrentTask] = useState<ListeningTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<"passage"|"question">("passage");
  const [currentSection, setCurrentSection] = useState(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [answerTimeLeft, setAnswerTimeLeft] = useState(0);
  const [mockTimeLeft, setMockTimeLeft] = useState<number | null>(null);
  const answerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mockExpiredRef = useRef(false);
  const taskSiblings = usePracticeTaskSiblings(
    "listening",
    fromLibrary ? taskId : null,
    currentTask?.task_type,
  );

  useEffect(() => { void loadTasks(); }, [taskId]);

  useEffect(() => {
    if (!mockParams) return;
    const tick = () => {
      const left = remainingMockSeconds();
      if (left === null) return;
      setMockTimeLeft(left);
      if (left <= 0 && !mockExpiredRef.current) {
        mockExpiredRef.current = true;
        void handleSubmit();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mockParams]);

  useEffect(() => {
    if (!tasks.length) return;
    if (taskId) {
      const found = tasks.find(t => t.id === taskId);
      if (found) {
        setCurrentTask(found);
        const idx = LISTENING_PARTS.findIndex(p => p.key === found.task_type);
        if (idx >= 0) setCurrentPartIndex(idx);
        resetState(); return;
      }
    }
    const found = tasks.find(t => t.task_type === LISTENING_PARTS[currentPartIndex].key);
    setCurrentTask(found || null);
    resetState();
  }, [currentPartIndex, tasks]);

  function resetState() {
    document.querySelectorAll("audio").forEach(a => { a.pause(); a.currentTime = 0; });
    setScreen("passage"); setCurrentSection(1);
    setCurrentQuestionIndex(0); setAnswers({});
    setShowTranscript(false);
    setUserInteracted(false);
    setAnswerTimeLeft(0);
    if (answerTimerRef.current) clearInterval(answerTimerRef.current);
  }

  useEffect(() => {
    if (!currentTask) return;
    const seconds = currentTask.content.answer_time_seconds ?? LISTENING_PARTS[currentPartIndex].answerTimeSeconds;
    setAnswerTimeLeft(screen === "question" ? seconds : 0);
  }, [currentTask?.id, currentPartIndex, screen, currentSection, currentQuestionIndex]);

  useEffect(() => {
    if (answerTimerRef.current) clearInterval(answerTimerRef.current);
    if (!currentTask || mockParams) return;
    if (screen !== "question") return;

    answerTimerRef.current = setInterval(() => {
      setAnswerTimeLeft(t => t - 1);
    }, 1000);

    return () => {
      if (answerTimerRef.current) clearInterval(answerTimerRef.current);
    };
  }, [currentTask, currentPartIndex, screen, mockParams]);

  async function loadTasks() {
    setLoading(true);
    if (taskId) {
      const { data } = await supabase.from("admin_tasks").select("*").eq("id", taskId).single();
      if (data) setTasks([data as ListeningTask]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("admin_tasks").select("*")
      .in("task_type", LISTENING_PARTS.map(p => p.key))
      .order("created_at", { ascending: true });
    const latest: Record<string, ListeningTask> = {};
    (data || []).forEach((t: ListeningTask) => { latest[t.task_type] = t; });
    setTasks(Object.values(latest));
    setLoading(false);
  }

  function handleAnswer(qId: number, opt: string) { setAnswers(p => ({ ...p, [qId]: opt })); }

  async function handleSubmit() {
    if (!currentTask) return;
    if (answerTimerRef.current) clearInterval(answerTimerRef.current);
    const questions = currentTask.content.questions || [];
    let correct = 0;
    questions.forEach(q => { if (answers[q.id] === q.correct_answer) correct++; });

    if (mockParams) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      const fin = await finishMockPracticePart(
        mockParams,
        {
          taskId: currentTask.id,
          taskType: currentTask.task_type,
          answers,
          score: correct,
          total: questions.length,
          questions,
          completedAt: new Date().toISOString(),
        },
        session.access_token,
      );
      window.location.href = fin.nextUrl;
      return;
    }

    sessionStorage.setItem("celpip_result", JSON.stringify({
      taskId: currentTask.id, taskType: currentTask.task_type,
      score: correct, total: questions.length, answers, questions,
    }));
    storeResultsReturn(listReturnHref);
    router.push("/practice/results");
  }

  function formatCountdown(seconds: number) {
    return formatPracticeTime(seconds);
  }

  function getCurrentQuestions() {
    if (!currentTask) return [];
    const qs = currentTask.content.questions || [];
    return LISTENING_PARTS[currentPartIndex].hasSections
      ? qs.filter(q => (q.section || 1) === currentSection)
      : qs;
  }

  function getDialogueForSection(): DialogueLine[] {
    const d = currentTask?.content.dialogue || [];
    if (!LISTENING_PARTS[currentPartIndex].hasSections) return d;
    // Filter by section tag if available, otherwise split evenly
    const tagged = d.filter((line: any) => (line.section || 1) === currentSection);
    if (tagged.length > 0) return tagged;
    // Fallback: split evenly
    const per = Math.ceil(d.length / 3);
    return d.slice((currentSection - 1) * per, currentSection * per);
  }

  function stopAllAudio() {
    document.querySelectorAll("audio").forEach(a => { a.pause(); a.currentTime = 0; });
  }

  function handleNextQuestion() {
    setUserInteracted(true);
    stopAllAudio();
    const qs = getCurrentQuestions();
    if (currentQuestionIndex < qs.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
    } else {
      const part = LISTENING_PARTS[currentPartIndex];
      if (part.hasSections && currentSection < 3) {
        setCurrentSection(s => s + 1);
        setCurrentQuestionIndex(0);
        setScreen("passage");
        setShowTranscript(false);
      } else {
        handleSubmit();
      }
    }
  }

  const currentPart = LISTENING_PARTS[currentPartIndex];
  const currentQuestions = getCurrentQuestions();
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const sectionDialogue = getDialogueForSection();

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
        <div>
          <PracticeTaskTypeDropdown
            section="listening"
            currentLabel={`Listening — ${currentPart.label}`}
            currentTaskType={currentTask?.task_type}
          />
          <p className="text-sm text-gray-600">{currentPart.title}</p>
          {fromLibrary && taskSiblings.total > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              Task {taskSiblings.position} of {taskSiblings.total}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mockParams && mockTimeLeft !== null && (
            <div
              className={`px-3 py-1 rounded-full border-2 font-mono text-sm font-bold ${
                mockTimeLeft < 60
                  ? "border-red-500 text-red-600 bg-red-50"
                  : "border-orange-500 text-orange-600 bg-orange-50"
              }`}
            >
              🕐 {formatMockTime(mockTimeLeft)}
            </div>
          )}
          {mockParams ? (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg"
            >
              Next part →
            </button>
          ) : fromLibrary ? (
            <>
              <button
                type="button"
                onClick={() => {
                  stopAllAudio();
                  if (taskSiblings.prevId) navigatePracticeTask(router, "listening", taskSiblings.prevId, listReturnHref);
                }}
                disabled={!taskSiblings.prevId}
                className="text-sm text-gray-600 hover:text-gray-700 disabled:opacity-30 font-medium"
              >
                PREV
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAllAudio();
                  if (taskSiblings.nextId) navigatePracticeTask(router, "listening", taskSiblings.nextId, listReturnHref);
                }}
                disabled={!taskSiblings.nextId}
                className="text-sm text-gray-600 hover:text-gray-700 disabled:opacity-30 font-medium"
              >
                NEXT
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { stopAllAudio(); setCurrentPartIndex(i => Math.max(0, i-1)); }} disabled={currentPartIndex === 0}
                className="text-sm text-gray-600 hover:text-gray-700 disabled:opacity-30 font-medium">PREV</button>
              <select value={currentPartIndex} onChange={e => setCurrentPartIndex(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {LISTENING_PARTS.map((p, i) => <option key={p.key} value={i}>{p.label} — {p.title}</option>)}
              </select>
              <button onClick={() => { stopAllAudio(); setCurrentPartIndex(i => Math.min(LISTENING_PARTS.length-1, i+1)); }}
                disabled={currentPartIndex === LISTENING_PARTS.length-1}
                className="text-sm text-gray-600 hover:text-gray-700 disabled:opacity-30 font-medium">NEXT</button>
            </>
          )}
        </div>
      </div>

      {!currentTask ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-white rounded-xl shadow p-10 max-w-md">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No task available</h2>
            <p className="text-gray-600 text-sm">No <strong>{currentPart.title}</strong> task generated yet.</p>
          </div>
        </div>

      ) : currentPart.onePerPage ? (
        /* ── ONE PER PAGE (Tasks 1-3) ── */
        <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
          {screen === "passage" ? (
            <div className="space-y-5">
              <div className="flex justify-between">
                <button
                  onClick={() => {
                    AM.stop();
                    if (currentSection > 1) {
                      setCurrentSection(s => s - 1);
                      setCurrentQuestionIndex(0);
                    }
                  }}
                  disabled={currentSection === 1}
                  className={`px-5 py-2 border rounded-lg text-sm transition ${
                    currentSection === 1
                      ? "border-gray-200 text-gray-300 cursor-not-allowed"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}>
                  ← Previous
                </button>
                <button onClick={() => { setUserInteracted(true); stopAllAudio(); setScreen("question"); }}
                  className="px-5 py-2 border-2 border-gray-800 rounded-lg text-sm font-bold text-gray-800 hover:bg-gray-100 transition">
                  Next →
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Listening Passage</h2>
                <AudioPlayer
                  key={`passage-${currentTask.id}-s${currentSection}`}
                  lines={sectionDialogue}
                  listeningType={currentPart.title}
                  cacheKey={`${currentTask.id}-${currentSection}`}
                  autoPlay={userInteracted}
                />
                <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700">{currentPart.title}</span>
                    <span className="text-xs text-gray-600">{currentTask.content.audio_length}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">
                    {currentTask.content.topic || currentTask.content.title}
                  </h3>
                  {currentTask.content.topic &&
                    currentTask.content.title &&
                    currentTask.content.topic !== currentTask.content.title && (
                      <p className="text-sm text-gray-600 mb-1">{currentTask.content.title}</p>
                    )}
                  <p className="text-sm text-gray-600">{currentTask.content.part_description}</p>
                </div>

                {/* Transcript */}
                {sectionDialogue.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button onClick={() => setShowTranscript(s => !s)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-sm font-semibold text-gray-700">
                      <span className="flex items-center gap-2">📄 Transcript <span className="text-xs font-normal text-gray-600">(click to {showTranscript ? "hide" : "show"})</span></span>
                      <span className={`transition-transform duration-200 ${showTranscript ? "rotate-180" : ""}`}>▾</span>
                    </button>
                    {showTranscript && (
                      <div className="px-4 py-4 space-y-3 max-h-64 overflow-y-auto bg-white">
                        {sectionDialogue.map((line, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="text-xs font-bold text-blue-600 whitespace-nowrap min-w-20 mt-0.5">{line.speaker}:</span>
                            <div className="text-sm text-gray-700 leading-relaxed flex-1 min-w-0">
                              <VocabularySelectableText text={line.text} source="listening" taskId={currentTask.id} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {currentPart.hasSections && (
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Section {currentSection} of 3</p>
                    <div className="flex gap-2">
                      {[1,2,3].map(s => (
                        <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s < currentSection ? "bg-indigo-600" : s === currentSection ? "bg-indigo-300" : "bg-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          ) : (
            /* Question Screen with audio */
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <button onClick={() => {
                    setUserInteracted(true);
                    stopAllAudio();
                    if (currentQuestionIndex > 0) {
                      setCurrentQuestionIndex(i => i - 1);
                    } else {
                      setScreen("passage");
                      setShowTranscript(false);
                    }
                  }}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                  ← Previous
                </button>
                <span className="text-sm font-bold text-gray-600">
                  Question {currentQuestionIndex + 1} of {currentQuestions.length}
                  {currentPart.hasSections && ` · Section ${currentSection}/3`}
                </span>
                <span className={`px-3 py-1.5 rounded-full border-2 text-sm font-mono font-bold ${
                  answerTimeLeft <= 10 ? "border-red-500 text-red-600 bg-red-50" : "border-indigo-500 text-indigo-700 bg-indigo-50"
                }`}>
                  Answer time {formatCountdown(answerTimeLeft)}
                </span>
                <button onClick={handleNextQuestion}
                  className="px-5 py-2 border-2 border-gray-800 rounded-lg text-sm font-bold text-gray-800 hover:bg-gray-100 transition">
                  {currentQuestionIndex === currentQuestions.length - 1
                    ? (currentPart.hasSections && currentSection < 3 ? "Next Section →" : "Submit ✓")
                    : "Next →"}
                </button>
              </div>

              {currentQuestion && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                  <p className="text-xs text-gray-600">Question {currentQuestionIndex + 1} of {currentTask.content.questions.length}</p>

                  {/* Question audio player — compact */}
                  <AudioPlayer
                    key={`q-${currentTask.id}-${currentQuestion.id}`}
                    lines={[{ speaker: "Question", text: currentQuestion.question }]}
                    listeningType={currentPart.title}
                    cacheKey={`q-${currentQuestion.id}`}
                    isQuestion={true}
                    compact={true}
                    autoPlay={userInteracted}
                  />

                  <p className="text-sm font-semibold text-gray-800">{currentQuestion.question}</p>

                  <div className="space-y-2">
                    {(["A","B","C","D"] as const).map(opt => {
                      const isSelected = answers[currentQuestion.id] === opt;
                      return (
                        <button key={`${currentQuestion.id}-${opt}`} onClick={() => handleAnswer(currentQuestion.id, opt)}
                          className={`w-full text-left px-5 py-4 rounded-lg border text-sm transition flex items-center gap-3 ${
                            isSelected ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                          }`}>
                          <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                            isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-gray-300 text-gray-600"
                          }`}>{isSelected ? opt : ""}</span>
                          {currentQuestion.options[opt]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      ) : (
        /* ── Passage first, questions after Next (Tasks 4-6) ── */
        <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
          {screen === "passage" ? (
            <div className="space-y-5">
              <div className="flex justify-end">
                <button onClick={() => { setUserInteracted(true); stopAllAudio(); setScreen("question"); setShowTranscript(false); }}
                  className="px-5 py-2 border-2 border-gray-800 rounded-lg text-sm font-bold text-gray-800 hover:bg-gray-100 transition">
                  Next →
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Listening Passage</h2>
                <AudioPlayer
                  key={currentTask.id}
                  lines={currentTask.content.dialogue}
                  listeningType={currentPart.title}
                  cacheKey={currentTask.id}
                />
                <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700">{currentPart.title}</span>
                    <span className="text-xs text-gray-600">{currentTask.content.audio_length}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">
                    {currentTask.content.topic || currentTask.content.title}
                  </h3>
                  {currentTask.content.topic &&
                    currentTask.content.title &&
                    currentTask.content.topic !== currentTask.content.title && (
                      <p className="text-sm text-gray-600 mb-1">{currentTask.content.title}</p>
                    )}
                  <p className="text-sm text-gray-600">{currentTask.content.part_description}</p>
                </div>
                {currentTask.content.dialogue?.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button onClick={() => setShowTranscript(s => !s)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-sm font-semibold text-gray-700">
                      <span className="flex items-center gap-2">📄 Transcript <span className="text-xs font-normal text-gray-600">(click to {showTranscript ? "hide" : "show"})</span></span>
                      <span className={`transition-transform duration-200 ${showTranscript ? "rotate-180" : ""}`}>▾</span>
                    </button>
                    {showTranscript && (
                      <div className="px-4 py-4 space-y-3 max-h-72 overflow-y-auto bg-white">
                        {currentTask.content.dialogue.map((line, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="text-xs font-bold text-blue-600 whitespace-nowrap min-w-20 mt-0.5">{line.speaker}:</span>
                            <div className="text-sm text-gray-700 leading-relaxed flex-1 min-w-0">
                              <VocabularySelectableText text={line.text} source="listening" taskId={currentTask.id} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => { stopAllAudio(); setScreen("passage"); }}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                  ← Previous
                </button>
                <span className={`px-3 py-1.5 rounded-full border-2 text-sm font-mono font-bold ${
                  answerTimeLeft <= 30 ? "border-red-500 text-red-600 bg-red-50" : "border-indigo-500 text-indigo-700 bg-indigo-50"
                }`}>
                  Answer time {formatCountdown(answerTimeLeft)}
                </span>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-gray-800">Choose the best way to complete each statement:</h3>
                {currentTask.content.questions?.map((q, i) => (
                  <div key={`${q.id}-${i}`} className="bg-white border border-gray-200 rounded-xl p-5">
                    <p className="text-sm font-semibold text-gray-800 mb-3">{i + 1}. {q.question}</p>
                    <select value={answers[q.id] || ""} onChange={e => handleAnswer(q.id, e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="" disabled>Select an option</option>
                      {(["A","B","C","D"] as const).map(opt => (
                        <option key={`${q.id}-${opt}`} value={opt}>{opt}. {q.options[opt]}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <button onClick={handleSubmit}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition">
                Submit Answers
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ListeningPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ListeningContent />
    </Suspense>
  );
}
