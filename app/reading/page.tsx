"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";

type Question = {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  explanation: string;
};

type Reading = {
  reading_type: string;
  title: string;
  passage: string;
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
  score: number;
  total: number;
  percentage: number;
  band: number;
  results: Result[];
};

export default function ReadingPage() {
  const [reading, setReading] = useState<Reading | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [error, setError] = useState("");
  const [readingType, setReadingType] = useState("Reading for Information");

  const readingTypes = [
    "Reading for Information",
    "Reading for Viewpoints",
    "Reading Correspondence",
    "Reading to Apply Information"
  ];

  async function generateReading() {
    setLoadingReading(true);
    setEvaluation(null);
    setUserAnswers({});
    setError("");
    try {
      const res = await fetch("/api/reading/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingType })
      });
      const data = await res.json();
      if (data.error) {
        setError("Failed to generate reading: " + data.error);
      } else {
        setReading(data);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
    setLoadingReading(false);
  }

  async function submitAnswers() {
    if (!reading) return;
    setLoadingEval(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/reading/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ""}`
        },
        body: JSON.stringify({
          questions: reading.questions,
          userAnswers,
          userId: session?.user?.id || null
        })
      });
      const data = await res.json();
      if (data.error) {
        setError("Evaluation failed: " + data.error);
      } else {
        setEvaluation(data);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
    setLoadingEval(false);
  }

  function getBandColor(band: number) {
    if (band >= 9) return "text-green-600";
    if (band >= 7) return "text-blue-600";
    if (band >= 5) return "text-yellow-600";
    return "text-red-600";
  }

  const allAnswered = reading
    ? reading.questions.every(q => userAnswers[q.id])
    : false;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white py-6 px-6 shadow">
        <h1 className="text-3xl font-bold">CELPIP Reading Practice</h1>
        <p className="text-green-200 mt-1">
          AI-powered reading comprehension tasks
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <a
            href="/"
            className="px-4 py-2 bg-white border rounded-full text-gray-600 text-sm hover:border-blue-400"
          >
            ✍️ Writing
          </a>
          <span className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-semibold">
            📖 Reading
          </span>
        </div>

        {/* Reading Type Selector */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Select Reading Type:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {readingTypes.map(type => (
              <button
                key={type}
                onClick={() => setReadingType(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  readingType === type
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 rounded-lg p-4 mb-6 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={generateReading}
          disabled={loadingReading}
          className="w-full bg-green-600 hover:bg-green-700 text-white
                     font-semibold py-4 px-6 rounded-xl shadow transition
                     mb-8 text-lg disabled:opacity-50"
        >
          {loadingReading
            ? "⏳ Generating Reading Task..."
            : "📖 Generate New Reading Task"}
        </button>

        {/* Passage */}
        {reading && (
          <div className="bg-white rounded-xl shadow p-6 mb-6 border-l-4 border-green-600">
            <h2 className="text-xl font-bold text-green-700 mb-1">
              {reading.title}
            </h2>
            <p className="text-xs text-gray-400 mb-4">{reading.reading_type}</p>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {reading.passage}
            </p>
          </div>
        )}

        {/* Questions */}
        {reading && !evaluation && (
          <div className="space-y-4 mb-6">
            {reading.questions.map((q, index) => (
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
                          ? "bg-green-50 border-green-500 text-green-800 font-medium"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:border-green-300"
                      }`}
                    >
                      <span className="font-bold mr-2">{key}.</span>
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Submit Button */}
            <button
              onClick={submitAnswers}
              disabled={loadingEval || !allAnswered}
              className="w-full bg-green-600 hover:bg-green-700 text-white
                         font-semibold py-4 rounded-xl shadow transition
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingEval
                ? "⏳ Evaluating..."
                : !allAnswered
                  ? `Answer all questions (${Object.keys(userAnswers).length}/${reading.questions.length})`
                  : "✅ Submit Answers"}
            </button>
          </div>
        )}

        {/* Results */}
        {evaluation && (
          <div className="space-y-4">
            {/* Score Card */}
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                📊 Your Results
              </h3>
              <p className={`text-7xl font-bold ${getBandColor(evaluation.band)}`}>
                {evaluation.band}
              </p>
              <p className="text-gray-400 text-sm mt-1">Band Score</p>
              <p className="text-gray-600 mt-3 text-lg">
                {evaluation.score} / {evaluation.total} correct
                ({evaluation.percentage}%)
              </p>
            </div>

            {/* Question Results */}
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
                    {result.is_correct ? "✅" : "❌"}
                  </span>
                </div>

                <div className="space-y-1 text-sm mb-3">
                  <p>
                    <span className="text-gray-500">Your answer: </span>
                    <span className={result.is_correct
                      ? "text-green-600 font-medium"
                      : "text-red-600 font-medium"
                    }>
                      {result.user_answer}
                    </span>
                  </p>
                  {!result.is_correct && (
                    <p>
                      <span className="text-gray-500">Correct answer: </span>
                      <span className="text-green-600 font-medium">
                        {result.correct_answer}
                      </span>
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                  💡 {result.explanation}
                </div>
              </div>
            ))}

            {/* Try Again */}
            <button
              onClick={generateReading}
              className="w-full bg-green-600 hover:bg-green-700 text-white
                         font-semibold py-4 rounded-xl shadow transition"
            >
              🔄 Try Another Reading Task
            </button>
          </div>
        )}
      </div>
    </main>
  );
}