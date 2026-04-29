"use client";
import { useState } from "react";
import { supabase } from "./lib/supabase";

type Task1 = {
  task_type: string;
  scenario: string;
  instructions: string;
  bullet_points: string[];
  word_limit: number;
  time_limit_minutes: number;
};

type Task2 = {
  task_type: string;
  topic: string;
  question: string;
  opinion_options: string[];
  word_limit: number;
  time_limit_minutes: number;
};

type Task = Task1 | Task2;

type Feedback = {
  overall_band: number;
  subscores: {
    task_fulfillment: number;
    coherence: number;
    vocabulary: number;
    grammar: number;
  };
  strengths: string[];
  areas_to_improve: string[];
  detailed_feedback: string;
  sample_improved_sentence: string;
};

export default function Home() {
  const [activeTask, setActiveTask] = useState("Writing Task 1");
  const [task, setTask] = useState<Task | null>(null);
  const [userResponse, setUserResponse] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState(""); 

  async function generateTask() {
    setLoadingTask(true);
    setFeedback(null);
    setUserResponse("");
    setWordCount(0);
    try {
      const res = await fetch("/api/tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType: activeTask })
      });
      const data = await res.json();
      setTask(data);
    } catch (err) {
      console.error(err);
    }
    setLoadingTask(false);
  }

  async function submitResponse() {
  if (!task || !userResponse.trim()) return;
  setLoadingFeedback(true);
  setError("");

  try {
    console.log("Step 1 - Getting user...");
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Step 2 - Session:", session?.user?.id || "not logged in");

    const taskPrompt = activeTask === "Writing Task 2"
      ? (task as Task2).question
      : (task as Task1).scenario + " " + (task as Task1).instructions;

    console.log("Step 3 - Sending to evaluate API...");

    const res = await fetch("/api/tasks/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Send auth token so API can save with user permissions
        "Authorization": `Bearer ${session?.access_token || ""}`
      },
      body: JSON.stringify({
        taskPrompt,
        userResponse,
        taskType: activeTask,
        userId: session?.user?.id || null
      })
    });

    console.log("Step 4 - Response status:", res.status);
    const data = await res.json();
    console.log("Step 5 - Response data:", data);

    if (data.error) {
      setError("Evaluation failed: " + data.error);
    } else {
      setFeedback(data);
    }

  } catch (err) {
    console.error("Caught error:", err);
    setError("Something went wrong: " + String(err));
  }

  setLoadingFeedback(false);
}

function handleResponseChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
  const text = e.target.value;
  setUserResponse(text);
  setWordCount(text.trim() === "" ? 0 : text.trim().split(/\s+/).length);
  console.log("Response length:", text.length); // add this line
}

  function getBandColor(band: number) {
    if (band >= 9) return "text-green-600";
    if (band >= 7) return "text-blue-600";
    if (band >= 5) return "text-yellow-600";
    return "text-red-600";
  }

  const wordLimit = task?.word_limit || 150;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white py-6 px-6 shadow">
        <h1 className="text-3xl font-bold">CELPIP Writing Practice</h1>
        <p className="text-blue-200 mt-1">
          AI-powered mock tests to help you reach your target score
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Navigation to other modules */}
        <div className="flex gap-3 mb-6">
          <span className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold">
            ✍️ Writing
          </span>
          <a
            href="/reading"
            className="px-4 py-2 bg-white border rounded-full text-gray-600 text-sm hover:border-green-400"
          >
            📖 Reading
          </a>
        </div>
        
        {/* Task Type Selector */}
        <div className="flex gap-3 mb-6">
          {["Writing Task 1", "Writing Task 2"].map((type) => (
            <button
              key={type}
              onClick={() => {
                setActiveTask(type);
                setTask(null);
                setFeedback(null);
                setUserResponse("");
              }}
              className={`px-6 py-2 rounded-full font-semibold transition ${
                activeTask === type
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white text-gray-600 border hover:border-blue-400"
              }`}
            >
              {type === "Writing Task 1" ? "✉️ Task 1 — Email" : "📋 Task 2 — Survey"}
            </button>
          ))}
        </div>

        {/* Task Description */}
        <div className="bg-white rounded-xl p-4 mb-6 border border-gray-200 text-sm text-gray-600">
          {activeTask === "Writing Task 1"
            ? "✉️ Write an email responding to a given situation. Address all bullet points provided. (150 words, 27 minutes)"
            : "📋 Read a survey question and write a structured response expressing and defending your opinion. (200 words, 26 minutes)"
          }
        </div>

        {/* Generate Button */}
        <button
          onClick={generateTask}
          disabled={loadingTask}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold
                     py-4 px-6 rounded-xl shadow transition mb-8 text-lg"
        >
          {loadingTask
            ? "⏳ Generating Task..."
            : `🎯 Generate New ${activeTask}`}
        </button>

        {/* Task 1 Display */}
        {task && activeTask === "Writing Task 1" && (
          <div className="bg-white rounded-xl shadow p-6 mb-6 border-l-4 border-blue-600">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-700">
                {(task as Task1).task_type}
              </h2>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>⏱ {task.time_limit_minutes} min</span>
                <span>📝 {task.word_limit} words</span>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="font-semibold text-gray-700 mb-1">Scenario:</p>
              <p className="text-gray-700">{(task as Task1).scenario}</p>
            </div>
            <div className="mb-4">
              <p className="font-semibold text-gray-700 mb-1">Instructions:</p>
              <p className="text-gray-700">{(task as Task1).instructions}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-2">
                Address these points:
              </p>
              <ul className="space-y-1">
                {(task as Task1).bullet_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <span className="text-blue-600 font-bold">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Task 2 Display */}
        {task && activeTask === "Writing Task 2" && (
          <div className="bg-white rounded-xl shadow p-6 mb-6 border-l-4 border-purple-600">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-purple-700">
                {(task as Task2).task_type}
              </h2>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>⏱ {task.time_limit_minutes} min</span>
                <span>📝 {task.word_limit} words</span>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <p className="font-semibold text-gray-700 mb-1">Topic:</p>
              <p className="text-gray-700">{(task as Task2).topic}</p>
            </div>
            <div className="mb-4">
              <p className="font-semibold text-gray-700 mb-2">Question:</p>
              <p className="text-gray-800 text-lg font-medium">
                {(task as Task2).question}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-2">
                Choose one opinion to defend:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(task as Task2).opinion_options.map((option, i) => (
                  <div
                    key={i}
                    className="bg-purple-50 border border-purple-200
                               rounded-lg p-3 text-gray-700 text-sm"
                  >
                    <span className="font-bold text-purple-600 mr-2">
                      Option {i + 1}:
                    </span>
                    {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Response Area */}
        {/* Response Area */}
        {task && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            {error && (
              <div className="bg-red-50 text-red-600 rounded-lg p-4 mb-4 text-sm">
                ❌ {error}
              </div>
            )}
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-700">
                Your Response
              </h3>
              <span className={`text-sm font-medium ${
                wordCount > wordLimit ? "text-red-500" : "text-gray-500"
              }`}>
                {wordCount} / {wordLimit} words
              </span>
            </div>
            <textarea
              value={userResponse}
              onChange={handleResponseChange}
              placeholder={
                activeTask === "Writing Task 1"
                  ? "Write your email response here..."
                  : "Write your survey response here. State your opinion clearly and support it with reasons and examples..."
              }
              className="w-full h-56 p-4 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-400
                         resize-none text-gray-700"
            />
            <button
              onClick={submitResponse}
              disabled={loadingFeedback || !userResponse.trim()}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white
                         font-semibold py-3 px-6 rounded-xl shadow transition
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingFeedback
                ? "⏳ Evaluating..."
                : "✅ Submit for AI Feedback"}
            </button>
          </div>
        )}

        {/* Feedback Display */}
        {feedback && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              📊 Your Results
            </h3>

            {/* Overall Band */}
            <div className="text-center bg-gray-50 rounded-xl p-6 mb-6">
              <p className="text-gray-500 mb-1">Overall Band Score</p>
              <p className={`text-7xl font-bold ${
                getBandColor(feedback.overall_band)
              }`}>
                {feedback.overall_band}
              </p>
              <p className="text-gray-400 text-sm mt-1">out of 12</p>
            </div>

            {/* Subscores */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {Object.entries(feedback.subscores).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 capitalize mb-1">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className={`text-2xl font-bold ${
                    getBandColor(value as number)
                  }`}>
                    {value as number}
                    <span className="text-gray-400 text-sm font-normal">
                      {" "}/ 12
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {/* Strengths */}
            <div className="mb-4">
              <h4 className="font-semibold text-green-700 mb-2">
                ✅ Strengths
              </h4>
              <ul className="space-y-2">
                {feedback.strengths.map((s, i) => (
                  <li key={i}
                    className="bg-green-50 text-green-800 rounded-lg p-3 text-sm">
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas to Improve */}
            <div className="mb-4">
              <h4 className="font-semibold text-orange-700 mb-2">
                📈 Areas to Improve
              </h4>
              <ul className="space-y-2">
                {feedback.areas_to_improve.map((s, i) => (
                  <li key={i}
                    className="bg-orange-50 text-orange-800 rounded-lg p-3 text-sm">
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Detailed Feedback */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">
                💬 Detailed Feedback
              </h4>
              <p className="bg-gray-50 rounded-lg p-4 text-gray-700 text-sm leading-relaxed">
                {feedback.detailed_feedback}
              </p>
            </div>

            {/* Sample Improved Sentence */}
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">
                ✨ Sample Improved Sentence
              </h4>
              <p className="bg-blue-50 rounded-lg p-4 text-blue-800 text-sm italic leading-relaxed">
                {feedback.sample_improved_sentence}
              </p>
            </div>

            {/* Try Again */}
            <button
              onClick={generateTask}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white
                         font-semibold py-3 px-6 rounded-xl shadow transition"
            >
              🔄 Try Another Task
            </button>
          </div>
        )}
      </div>
    </main>
  );
}