"use client";
import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";

type DialogueLine = {
  speaker: string;
  text: string;
};

type Question = {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  explanation: string;
};

type ListeningTask = {
  listening_type: string;
  title: string;
  dialogue: DialogueLine[];
  questions: Question[];
};

type Result = {
  id: number;
  question: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
};

type Evaluation = {
  correct: number;
  total: number;
  percentage: number;
  band: number;
  results: Result[];
};

type Phase = "idle" | "listening" | "answering" | "done";

export default function ListeningPage() {
  const [task, setTask] = useState<ListeningTask | null>(null);
  const [listeningType, setListeningType] = useState("Daily Life Conversation");
  const [phase, setPhase] = useState<Phase>("idle");
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(-1);
  const [playCount, setPlayCount] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const listeningTypes = [
    "Daily Life Conversation",
    "Workplace Discussion",
    "Phone Conversation",
    "News Report",
    "Announcement",
    "Interview"
  ];

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
    setUserAnswers({});
    setPhase("idle");
    setError("");
    setCurrentLine(-1);
    setPlayCount(0);
    window.speechSynthesis.cancel();
    try {
      const res = await fetch("/api/listening/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listeningType })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setTask(data);
        setPhase("listening");
      }
    } catch (err) {
      setError("Failed to generate task. Please try again.");
    }
    setLoadingTask(false);
  }

  function playDialogue() {
    if (!task) return;
    window.speechSynthesis.cancel();
    setIsPlaying(true);
    setCurrentLine(0);

    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Victoria"));
    const maleVoice = voices.find(v => v.name.includes("Male") || v.name.includes("Daniel") || v.name.includes("Alex"));

    let lineIndex = 0;

    function speakLine(index: number) {
      if (index >= task!.dialogue.length) {
        setIsPlaying(false);
        setCurrentLine(-1);
        setPlayCount(prev => prev + 1);
        return;
      }

      setCurrentLine(index);
      const line = task!.dialogue[index];
      const utterance = new SpeechSynthesisUtterance(line.text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Alternate voices for different speakers
      const speakers = [...new Set(task!.dialogue.map(d => d.speaker))];
      if (line.speaker === speakers[0] && femaleVoice) {
        utterance.voice = femaleVoice;
      } else if (maleVoice) {
        utterance.voice = maleVoice;
      }

      utterance.onend = () => {
        setTimeout(() => speakLine(index + 1), 300);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }

    speakLine(0);
  }

  function stopDialogue() {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentLine(-1);
  }

  function proceedToQuestions() {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentLine(-1);
    setPhase("answering");
  }

  async function submitAnswers() {
    if (!task) return;
    setLoadingEval(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/listening/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: task.questions,
          userAnswers,
          userId: session?.user?.id || null,
          token: session?.access_token || ""
        })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setEvaluation(data);
        setPhase("done");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
    setLoadingEval(false);
  }

  const allAnswered = task
    ? task.questions.every(q => userAnswers[q.id])
    : false;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-orange-600 text-white py-6 px-6 shadow">
        <h1 className="text-3xl font-bold">CELPIP Listening Practice</h1>
        <p className="text-orange-200 mt-1">
          AI-generated dialogues with browser text-to-speech
        </p>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex gap-3 mb-6 flex-wrap">
          <a href="/" className="px-4 py-2 bg-white border rounded-full text-gray-600 text-sm hover:border-blue-400">Writing</a>
          <a href="/reading" className="px-4 py-2 bg-white border rounded-full text-gray-600 text-sm hover:border-green-400">Reading</a>
          <a href="/speaking" className="px-4 py-2 bg-white border rounded-full text-gray-600 text-sm hover:border-purple-400">Speaking</a>
          <span className="px-4 py-2 bg-orange-600 text-white rounded-full text-sm font-semibold">Listening</span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          <strong>Note:</strong> This module uses your browser built-in text-to-speech.
          Use <strong>Google Chrome</strong> for best voice quality.
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-lg p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Type Selector */}
        {phase === "idle" && (
          <>
            <div className="bg-white rounded-xl shadow p-4 mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Select Listening Type:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {listeningTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setListeningType(type)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      listeningType === type
                        ? "bg-orange-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateTask}
              disabled={loadingTask}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-6 rounded-xl shadow transition mb-8 text-lg disabled:opacity-50"
            >
              {loadingTask ? "Generating Task..." : "Generate New Listening Task"}
            </button>
          </>
        )}

        {/* Listening Phase */}
        {phase === "listening" && task && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-600">
              <h2 className="text-xl font-bold text-orange-700 mb-1">
                {task.title}
              </h2>
              <p className="text-xs text-gray-400 mb-4">{task.listening_type}</p>

              {/* Play Controls */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={playDialogue}
                  disabled={isPlaying}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
                >
                  {isPlaying ? "Playing..." : playCount === 0 ? "Play Dialogue" : "Play Again"}
                </button>
                {isPlaying && (
                  <button
                    onClick={stopDialogue}
                    className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition"
                  >
                    Stop
                  </button>
                )}
              </div>

              {/* Dialogue Script */}
              <div className="space-y-3 mb-6">
                {task.dialogue.map((line, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 p-3 rounded-lg transition ${
                      currentLine === index
                        ? "bg-orange-50 border border-orange-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <span className={`font-bold text-sm whitespace-nowrap ${
                      currentLine === index ? "text-orange-600" : "text-gray-500"
                    }`}>
                      {line.speaker}:
                    </span>
                    <p className={`text-sm ${
                      currentLine === index ? "text-gray-900" : "text-gray-600"
                    }`}>
                      {line.text}
                    </p>
                  </div>
                ))}
              </div>

              {playCount > 0 && (
                <button
                  onClick={proceedToQuestions}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl shadow transition"
                >
                  Answer Questions
                </button>
              )}

              {playCount === 0 && (
                <p className="text-center text-gray-400 text-sm">
                  Listen to the dialogue first before answering questions
                </p>
              )}
            </div>

            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                setPhase("idle");
                setTask(null);
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition"
            >
              Generate Different Task
            </button>
          </div>
        )}

        {/* Questions Phase */}
        {phase === "answering" && task && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800 mb-2">
              Answer based on what you heard. You cannot go back to listen again.
            </div>

            {task.questions.map((q, index) => (
              <div key={q.id} className="bg-white rounded-xl shadow p-6">
                <p className="font-semibold text-gray-800 mb-4">
                  {index + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {Object.entries(q.options).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setUserAnswers(prev => ({
                        ...prev,
                        [q.id]: key
                      }))}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                        userAnswers[q.id] === key
                          ? "bg-orange-50 border-orange-500 text-orange-800 font-medium"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:border-orange-300"
                      }`}
                    >
                      <span className="font-bold mr-2">{key}.</span>
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={submitAnswers}
              disabled={loadingEval || !allAnswered}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 rounded-xl shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingEval
                ? "Evaluating..."
                : !allAnswered
                  ? `Answer all questions (${Object.keys(userAnswers).length}/${task.questions.length})`
                  : "Submit Answers"}
            </button>
          </div>
        )}

        {/* Results */}
        {phase === "done" && evaluation && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Your Results</h3>
              <p className={`text-7xl font-bold ${getBandColor(evaluation.band)}`}>
                {evaluation.band}
              </p>
              <p className="text-gray-400 text-sm mt-1">Band Score</p>
              <p className="text-gray-600 mt-3 text-lg">
                {evaluation.correct} / {evaluation.total} correct ({evaluation.percentage}%)
              </p>
            </div>

            {evaluation.results.map((result, index) => (
              <div
                key={result.id}
                className={`bg-white rounded-xl shadow p-6 border-l-4 ${
                  result.is_correct ? "border-green-500" : "border-red-500"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="font-semibold text-gray-800 flex-1">
                    {index + 1}. {result.question}
                  </p>
                  <span className={`ml-3 text-xl ${
                    result.is_correct ? "text-green-500" : "text-red-500"
                  }`}>
                    {result.is_correct ? "Correct" : "Wrong"}
                  </span>
                </div>
                <div className="space-y-1 text-sm mb-3">
                  <p>
                    <span className="text-gray-500">Your answer: </span>
                    <span className={result.is_correct ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                      {result.user_answer}
                    </span>
                  </p>
                  {!result.is_correct && (
                    <p>
                      <span className="text-gray-500">Correct answer: </span>
                      <span className="text-green-600 font-medium">{result.correct_answer}</span>
                    </p>
                  )}
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                  {result.explanation}
                </div>
              </div>
            ))}

            <button
              onClick={() => {
                setPhase("idle");
                setTask(null);
                setEvaluation(null);
                setUserAnswers({});
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 rounded-xl shadow transition"
            >
              Try Another Listening Task
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
