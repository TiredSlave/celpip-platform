"use client";
import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";

type SpeakingTask = {
  task_number: number;
  task_type: string;
  situation: string;
  prompt: string;
  preparation_time_seconds: number;
  speaking_time_seconds: number;
  tips: string[];
  image_url?: string;
  image_url_1?: string;
  image_url_2?: string;
};

type Evaluation = {
  overall_band: number;
  subscores: {
    coherence: number;
    vocabulary: number;
    grammar: number;
    pronunciation_fluency: number;
  };
  strengths: string[];
  areas_to_improve: string[];
  detailed_feedback: string;
  sample_improved_response: string;
};

type Phase = "idle" | "preparing" | "recording" | "processing" | "done";

export default function SpeakingPage() {
  const [task, setTask] = useState<SpeakingTask | null>(null);
  const [taskNumber, setTaskNumber] = useState(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [prepTimeLeft, setPrepTimeLeft] = useState(0);
  const [recTimeLeft, setRecTimeLeft] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [error, setError] = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");

  function getBandColor(band: number) {
    if (band >= 9) return "text-green-600";
    if (band >= 7) return "text-blue-600";
    if (band >= 5) return "text-yellow-600";
    return "text-red-600";
  }

  async function generateTask() {
    setLoadingTask(true);
    setTask(null);
    setEvaluation(null);
    setTranscript("");
    setInterimTranscript("");
    setPhase("idle");
    setError("");
    finalTranscriptRef.current = "";
    try {
      const res = await fetch("/api/speaking/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskNumber })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setTask(data);
      }
    } catch (err) {
      setError("Failed to generate task. Please try again.");
    }
    setLoadingTask(false);
  }

  function startPreparation() {
    if (!task) return;
    setPhase("preparing");
    setPrepTimeLeft(task.preparation_time_seconds);
    timerRef.current = setInterval(() => {
      setPrepTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function startRecording() {
    if (!task) return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Please use Google Chrome for speech recognition.");
      setPhase("idle");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    finalTranscriptRef.current = "";
    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (final) finalTranscriptRef.current += final;
      setInterimTranscript(interim);
      setTranscript(finalTranscriptRef.current);
    };
    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        setError("Microphone error: " + event.error);
      }
    };
    recognition.start();
    setPhase("recording");
    setRecTimeLeft(task.speaking_time_seconds);
    timerRef.current = setInterval(() => {
      setRecTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("processing");
    setTimeout(() => submitTranscript(), 1000);
  }

  async function submitTranscript() {
    if (!task) return;
    const finalText = finalTranscriptRef.current.trim();
    if (!finalText) {
      setError("No speech detected. Please try again.");
      setPhase("idle");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/speaking/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: finalText,
          taskPrompt: task.prompt,
          taskNumber: task.task_number,
          userId: session?.user?.id || "",
          token: session?.access_token || ""
        })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setPhase("idle");
      } else {
        setTranscript(data.transcript);
        setEvaluation(data.evaluation);
        setPhase("done");
      }
    } catch (err) {
      setError("Failed to evaluate. Please try again.");
      setPhase("idle");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-purple-700 text-white py-6 px-6 shadow">
        <h1 className="text-3xl font-bold">CELPIP Speaking Practice</h1>
        <p className="text-purple-200 mt-1">AI-powered speaking evaluation</p>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex gap-3 mb-6 flex-wrap">
          <a href="/" className="px-4 py-2 bg-white border rounded-full text-gray-600 text-sm hover:border-blue-400">Writing</a>
          <a href="/reading" className="px-4 py-2 bg-white border rounded-full text-gray-600 text-sm hover:border-green-400">Reading</a>
          <span className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-semibold">Speaking</span>
          <a href="/listening" className="px-4 py-2 bg-white border rounded-full text-gray-600 text-sm hover:border-orange-400">Listening</a>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          Use Google Chrome for best results. Allow microphone access when prompted.
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-lg p-4 mb-6 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Select Speaking Task:</p>
          <div className="grid grid-cols-4 gap-2">
            {[1,2,3,4,5,6,7,8].map(num => (
              <button
                key={num}
                onClick={() => setTaskNumber(num)}
                className={"py-2 rounded-lg text-sm font-medium transition " + (taskNumber === num ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
              >
                Task {num}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generateTask}
          disabled={loadingTask || phase === "recording" || phase === "preparing"}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow transition mb-8 text-lg disabled:opacity-50"
        >
          {loadingTask ? "Generating Task..." : "Generate New Speaking Task"}
        </button>

        {task && phase === "idle" && (
          <div className="bg-white rounded-xl shadow p-6 mb-6 border-l-4 border-purple-600">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-purple-700">Speaking Task {task.task_number}</h2>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>Prep: {task.preparation_time_seconds}s</span>
                <span>Speak: {task.speaking_time_seconds}s</span>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <p className="font-semibold text-gray-700 mb-1">Situation:</p>
              <p className="text-gray-700">{task.situation}</p>
            </div>

            {task.task_number === 3 && task.image_url && (
              <div className="mb-4">
                <p className="font-semibold text-gray-700 mb-2">Describe this image:</p>
                <img src={task.image_url} alt="Speaking task" className="w-full rounded-lg shadow" />
              </div>
            )}

            {task.task_number === 5 && task.image_url_1 && (
              <div className="mb-4">
                <p className="font-semibold text-gray-700 mb-2">Compare these two images:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1 text-center">Image 1</p>
                    <img src={task.image_url_1} alt="Image 1" className="w-full rounded-lg shadow" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1 text-center">Image 2</p>
                    <img src={task.image_url_2} alt="Image 2" className="w-full rounded-lg shadow" />
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="font-semibold text-gray-700 mb-1">Your Task:</p>
              <p className="text-gray-800 text-lg">{task.prompt}</p>
            </div>
            <div className="mb-6">
              <p className="font-semibold text-gray-700 mb-2">Tips:</p>
              <ul className="space-y-1">
                {task.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
                    <span className="text-purple-500 font-bold">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={startPreparation}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl shadow transition"
            >
              Start Preparation Time
            </button>
          </div>
        )}

        {phase === "preparing" && (
          <div className="bg-white rounded-xl shadow p-8 mb-6 text-center">
            <p className="text-gray-500 mb-2">Preparation Time</p>
            <p className="text-8xl font-bold text-blue-600 font-mono mb-4">{prepTimeLeft}</p>
            <p className="text-gray-500">Plan your response carefully</p>
            {task && (
              <div className="bg-gray-50 rounded-lg p-4 mt-4 text-left">
                <p className="text-gray-700">{task.prompt}</p>
              </div>
            )}
            {task && task.task_number === 3 && task.image_url && (
              <img src={task.image_url} alt="Speaking task" className="w-full rounded-lg mt-4" />
            )}
            {task && task.task_number === 5 && task.image_url_1 && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <img src={task.image_url_1} alt="Image 1" className="w-full rounded-lg" />
                <img src={task.image_url_2} alt="Image 2" className="w-full rounded-lg" />
              </div>
            )}
          </div>
        )}

        {phase === "recording" && (
          <div className="bg-white rounded-xl shadow p-8 mb-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
              <p className="text-red-500 font-semibold text-lg">Recording...</p>
            </div>
            <p className="text-8xl font-bold text-red-600 font-mono mb-4">{recTimeLeft}</p>
            <p className="text-gray-500 mb-4">Speak clearly into your microphone</p>
            {task && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                <p className="text-gray-700">{task.prompt}</p>
              </div>
            )}
            {task && task.task_number === 3 && task.image_url && (
              <img src={task.image_url} alt="Speaking task" className="w-full rounded-lg mb-4" />
            )}
            {task && task.task_number === 5 && task.image_url_1 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <img src={task.image_url_1} alt="Image 1" className="w-full rounded-lg" />
                <img src={task.image_url_2} alt="Image 2" className="w-full rounded-lg" />
              </div>
            )}
            {(transcript || interimTranscript) && (
              <div className="bg-purple-50 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-purple-600 font-semibold mb-1">Live transcript:</p>
                <p className="text-gray-700 text-sm">
                  {transcript}
                  <span className="text-gray-400 italic">{interimTranscript}</span>
                </p>
              </div>
            )}
            <button
              onClick={stopRecording}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-8 rounded-xl shadow transition"
            >
              Stop Recording Early
            </button>
          </div>
        )}

        {phase === "processing" && (
          <div className="bg-white rounded-xl shadow p-8 mb-6 text-center">
            <div className="text-6xl mb-4">processing...</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Processing Your Response</h3>
            <p className="text-gray-500">Evaluating with Claude CELPIP examiner...</p>
          </div>
        )}

        {phase === "done" && evaluation && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-600">
              <h3 className="font-bold text-gray-800 mb-2">Your Transcript</h3>
              <p className="text-gray-700 italic">"{transcript}"</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Your Results</h3>
              <p className={"text-7xl font-bold " + getBandColor(evaluation.overall_band)}>{evaluation.overall_band}</p>
              <p className="text-gray-400 text-sm mt-1">Overall Band Score</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(evaluation.subscores).map(([key, value]) => (
                <div key={key} className="bg-white rounded-xl shadow p-4">
                  <p className="text-sm text-gray-500 capitalize mb-1">{key.replace(/_/g, " ")}</p>
                  <p className={"text-2xl font-bold " + getBandColor(value as number)}>
                    {value as number}<span className="text-gray-400 text-sm font-normal"> / 12</span>
                  </p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h4 className="font-semibold text-green-700 mb-2">Strengths</h4>
              <ul className="space-y-2">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="bg-green-50 text-green-800 rounded-lg p-3 text-sm">{s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h4 className="font-semibold text-orange-700 mb-2">Areas to Improve</h4>
              <ul className="space-y-2">
                {evaluation.areas_to_improve.map((s, i) => (
                  <li key={i} className="bg-orange-50 text-orange-800 rounded-lg p-3 text-sm">{s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h4 className="font-semibold text-gray-700 mb-2">Detailed Feedback</h4>
              <p className="bg-gray-50 rounded-lg p-4 text-gray-700 text-sm leading-relaxed">{evaluation.detailed_feedback}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h4 className="font-semibold text-purple-700 mb-2">Sample Improved Response</h4>
              <p className="bg-purple-50 rounded-lg p-4 text-purple-800 text-sm italic leading-relaxed">{evaluation.sample_improved_response}</p>
            </div>
            <button
              onClick={generateTask}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-xl shadow transition"
            >
              Try Another Speaking Task
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
