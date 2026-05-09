"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Question = {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  explanation: string;
  option_explanations?: { A: string; B: string; C: string; D: string };
};

type Result = {
  taskId: string;
  taskType: string;
  score: number;
  total: number;
  answers: Record<number, string>;
  questions: Question[];
  feedback?: any;
};

function ResultsContent() {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const data = sessionStorage.getItem("celpip_result");
    if (!data) { router.push("/practice"); return; }
    const parsed = JSON.parse(data);
    setResult(parsed);
    saveResult(parsed);
  }, []);

  async function saveResult(r: Result) {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSaving(false); return; }
      await supabase.from("user_results").insert({
        user_id: session.user.id,
        task_id: r.taskId,
        task_type: r.taskType,
        score: r.score,
        total: r.total,
        answers: r.answers,
        feedback: { questions: r.questions },
      });
      setSaved(true);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  if (!result) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pct = Math.round((result.score / result.total) * 100);
  const scoreColor = pct >= 80 ? "text-green-600" : pct >= 60 ? "text-yellow-600" : "text-red-600";
  const scoreBg = pct >= 80 ? "bg-green-50 border-green-200" : pct >= 60 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  const section = result.taskType.includes("Writing") ? "writing"
    : result.taskType.includes("Reading") ? "reading"
    : result.taskType.includes("Speaking") ? "speaking"
    : "listening";

  const sectionStyle = {
    writing:   { btn: "bg-blue-600 hover:bg-blue-700",    text: "text-blue-600",   back: "/practice/writing"   },
    reading:   { btn: "bg-green-600 hover:bg-green-700",  text: "text-green-600",  back: "/practice/reading"   },
    speaking:  { btn: "bg-purple-600 hover:bg-purple-700",text: "text-purple-600", back: "/practice/speaking"  },
    listening: { btn: "bg-orange-600 hover:bg-orange-700",text: "text-orange-600", back: "/practice/listening" },
  }[section];

  const isWriting = result.taskType.includes("Writing");

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={sectionStyle.back} className={"text-sm hover:underline " + sectionStyle.text}>
              ← Back to {section.charAt(0).toUpperCase() + section.slice(1)} Practice
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Results</h1>
            <p className="text-sm text-gray-500">{result.taskType}</p>
          </div>
          {saving && <span className="text-xs text-gray-400">Saving...</span>}
          {saved && <span className="text-xs text-green-600 font-medium">✅ Saved to history</span>}
        </div>

        {/* Score Card */}
        <div className={"border rounded-2xl p-8 mb-8 text-center " + scoreBg}>
          <div className={"text-6xl font-bold mb-2 " + scoreColor}>{result.score}/{result.total}</div>
          <div className={"text-2xl font-semibold mb-1 " + scoreColor}>{pct}%</div>
          <p className="text-gray-600 text-sm">
            {pct >= 80 ? "Excellent work! 🎉" : pct >= 60 ? "Good effort! Keep practicing 💪" : "Keep going — practice makes perfect! 📚"}
          </p>
        </div>

        {/* Writing Feedback */}
        {isWriting && result.feedback && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-800">AI Feedback</h2>
              {result.feedback.band && (
                <span className="bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">Band {result.feedback.band}</span>
              )}
            </div>
            {result.feedback.overall && <p className="text-gray-700 text-sm leading-relaxed mb-4">{result.feedback.overall}</p>}
            {result.feedback.criteria && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {Object.entries(result.feedback.criteria).map(([key, val]: any) => (
                  <div key={key} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-600 capitalize mb-1">{key.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-600">{val}</p>
                  </div>
                ))}
              </div>
            )}
            {result.feedback.improvements && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">Areas to improve:</p>
                <ul className="space-y-1">
                  {result.feedback.improvements.map((imp: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-orange-500 flex-shrink-0">→</span>{imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Question Review */}
        {result.questions && result.questions.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800">Question Review</h2>
            {result.questions.map((q, i) => {
              const userAnswer = result.answers[q.id];
              const isCorrect = userAnswer === q.correct_answer;
              return (
                <div key={q.id} className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className={"w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white " + (isCorrect ? "bg-green-500" : "bg-red-500")}>
                      {isCorrect ? "✓" : "✗"}
                    </span>
                    <p className="text-sm font-semibold text-gray-800">{i + 1}. {q.question}</p>
                  </div>

                  <div className="space-y-2 mb-4">
                    {(["A","B","C","D"] as const).map(opt => {
                      const isCorrectOpt = opt === q.correct_answer;
                      const isUserWrong = opt === userAnswer && !isCorrectOpt;
                      const explanation = q.option_explanations?.[opt];
                      return (
                        <div key={opt} className={"rounded-xl border p-3 " + (isCorrectOpt ? "border-green-400 bg-green-50" : isUserWrong ? "border-red-400 bg-red-50" : "border-gray-100 bg-gray-50")}>
                          <div className="flex items-center gap-3 mb-1">
                            <span className={"w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold " + (isCorrectOpt ? "border-green-500 bg-green-500 text-white" : isUserWrong ? "border-red-400 bg-red-400 text-white" : "border-gray-300 text-gray-400")}>
                              {isCorrectOpt ? "✓" : isUserWrong ? "✗" : opt}
                            </span>
                            <span className={"text-sm font-medium " + (isCorrectOpt ? "text-green-800" : isUserWrong ? "text-red-800" : "text-gray-600")}>
                              {opt}. {q.options[opt]}
                            </span>
                            {isCorrectOpt && <span className="ml-auto text-xs font-bold text-green-600">Correct</span>}
                            {isUserWrong && <span className="ml-auto text-xs font-bold text-red-500">Your answer</span>}
                          </div>
                          {explanation && (
                            <p className={"text-xs ml-9 leading-relaxed " + (isCorrectOpt ? "text-green-700" : isUserWrong ? "text-red-700" : "text-gray-500")}>
                              {explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-yellow-800 mb-1">💡 Explanation</p>
                    <p className="text-xs text-yellow-800 leading-relaxed">{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <Link href={sectionStyle.back} className={"flex-1 text-center py-3 rounded-xl text-white font-semibold text-sm transition " + sectionStyle.btn}>
            Try Another Task
          </Link>
          <Link href="/practice" className="flex-1 text-center py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">
            Back to Practice
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
