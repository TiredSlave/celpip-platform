"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

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
  studentResponse?: string;
  transcript?: string;
  isSpeaking?: boolean;
  writingTask2Choice?: "A" | "B" | null;
  writingTask2ChosenLabel?: string;
};

/** Rubric copy for writing — mirrors “question + explanation” blocks on reading/listening results */
const WRITING_CRITERIA_META: Record<string, { label: string; rule: string }> = {
  content_coherence: {
    label: "Content / Coherence",
    rule: "Examiners look for clear ideas, logical order, and smooth links between sentences and paragraphs. Higher levels show fully developed points with few gaps.",
  },
  vocabulary: {
    label: "Vocabulary range & precision",
    rule: "Range, accuracy, and fit for the situation matter. Strong responses use varied, natural word choices with few errors that do not obscure meaning.",
  },
  readability: {
    label: "Readability & tone",
    rule: "Grammar, punctuation, sentence variety, and an appropriate register (formal/informal) for the task. Minor slips are acceptable if meaning stays clear.",
  },
  task_fulfillment: {
    label: "Task fulfillment",
    rule: "Task 1: all bullet points and instructions are covered. Task 2: the essay should defend the option the candidate selected (A or B); arguing mainly for the other side or staying vague lowers the score.",
  },
};

/** Rubric copy for speaking subscores — matches API keys from `/api/speaking/evaluate` */
const SPEAKING_SUBSCORE_META: Record<string, { label: string; rule: string }> = {
  coherence: {
    label: "Coherence & cohesion",
    rule: "How clearly ideas are organized and linked. Higher bands show logical flow, enough detail for the task, and fewer long pauses or false starts that break communication.",
  },
  vocabulary: {
    label: "Vocabulary range & accuracy",
    rule: "Fit and precision of word choice for the situation. Strong answers use varied, natural language; staying very basic or repeating the same words lowers the band.",
  },
  grammar: {
    label: "Grammar & sentence control",
    rule: "Range and accuracy of structures. Minor slips are acceptable when meaning stays clear; frequent errors that interfere with understanding lower the band.",
  },
  pronunciation_fluency: {
    label: "Pronunciation & fluency",
    rule: "Intelligibility, rhythm, and smooth delivery. Natural self-correction is fine; long silences or speech that is hard to follow reduces the score.",
  },
};

function bandAccentClass(b: number) {
  if (b >= 9) return "text-green-600";
  if (b >= 7) return "text-blue-600";
  if (b >= 5) return "text-yellow-600";
  return "text-red-600";
}

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
        feedback: {
          questions: r.questions,
          ...(r.feedback ? { ai: r.feedback } : {}),
          ...(r.studentResponse ? { studentResponse: r.studentResponse } : {}),
          ...(r.transcript ? { transcript: r.transcript } : {}),
          ...(r.writingTask2Choice ? { writingTask2Choice: r.writingTask2Choice } : {}),
          ...(r.writingTask2ChosenLabel ? { writingTask2ChosenLabel: r.writingTask2ChosenLabel } : {}),
        },
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

  const retakeHref = result.taskId
    ? `/practice/${section}/task?taskId=${encodeURIComponent(result.taskId)}`
    : sectionStyle.back;

  const isWriting = result.taskType.includes("Writing");
  const isSpeaking = result.taskType.includes("Speaking");
  const speakFb = isSpeaking && result.feedback ? result.feedback as {
    overall_band?: number;
    subscores?: Record<string, number>;
    strengths?: string[];
    areas_to_improve?: string[];
    detailed_feedback?: string;
    sample_improved_response?: string;
  } : null;

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
          {(isWriting || isSpeaking) && (
            <p className="text-gray-500 text-xs mb-2">Practice band score (12 = strongest for this drill)</p>
          )}
          <p className="text-gray-600 text-sm">
            {pct >= 80 ? "Excellent work! 🎉" : pct >= 60 ? "Good effort! Keep practicing 💪" : "Keep going — practice makes perfect! 📚"}
          </p>
        </div>

        {/* Writing — same information architecture as Question Review (per-item cards + tip boxes) */}
        {isWriting && result.feedback && (
          <div className="space-y-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800">Response review</h2>

            {result.studentResponse && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm font-semibold text-gray-800 mb-3">Your response</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{result.studentResponse}</p>
              </div>
            )}

            {result.writingTask2Choice && (
              <div className="bg-white border border-blue-200 rounded-2xl p-6">
                <p className="text-sm font-semibold text-gray-800 mb-2">Declared choice (Task 2)</p>
                <p className="text-sm text-gray-700">
                  You selected <span className="font-bold text-blue-700">Option {result.writingTask2Choice}</span>
                  {result.writingTask2ChosenLabel ? (
                    <span className="block mt-2 text-gray-600 leading-relaxed">&ldquo;{result.writingTask2ChosenLabel}&rdquo;</span>
                  ) : null}
                </p>
                <p className="text-xs text-gray-500 mt-2">Feedback below was scored against this option.</p>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-bold text-gray-800">Overall feedback</h3>
                {result.feedback.band != null && result.feedback.band !== "" && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">Band {result.feedback.band}</span>
                )}
              </div>
              {result.feedback.overall && (
                <p className="text-sm text-gray-700 leading-relaxed">{result.feedback.overall}</p>
              )}
            </div>

            {result.feedback.criteria && (() => {
              const criteria = result.feedback.criteria as Record<string, string>;
              const primaryOrder = Object.keys(WRITING_CRITERIA_META);
              const keys = [
                ...primaryOrder.filter(k => criteria[k] != null && String(criteria[k]).trim() !== ""),
                ...Object.keys(criteria).filter(k => !primaryOrder.includes(k)),
              ];
              if (keys.length === 0) return null;
              return (
              <>
                <h2 className="text-lg font-bold text-gray-800">Ratings by criterion</h2>
                {keys.map((key, idx) => {
                  const val = criteria[key];
                  const meta = WRITING_CRITERIA_META[key] || {
                    label: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                    rule: "This dimension reflects how well your writing meets CELPIP-style expectations for the task.",
                  };
                  return (
                    <div key={key} className="bg-white border border-gray-200 rounded-2xl p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-blue-500">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-semibold text-gray-800">{meta.label}</p>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4">
                        <p className="text-xs font-bold text-yellow-800 mb-1">💡 How this is scored</p>
                        <p className="text-xs text-yellow-800 leading-relaxed">{meta.rule}</p>
                      </div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Your feedback</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{String(val)}</p>
                    </div>
                  );
                })}
              </>
              );
            })()}

            {result.feedback.improvements && result.feedback.improvements.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-gray-800 mb-3">Areas to improve</p>
                <ul className="space-y-2">
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

        {/* Speaking — same card pattern as writing (transcript, overall, rubric + score per dimension, lists, sample) */}
        {speakFb && (
          <div className="space-y-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800">Response review</h2>

            {result.transcript != null && String(result.transcript).trim() !== "" && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm font-semibold text-gray-800 mb-3">What you said (transcript)</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap italic">&ldquo;{result.transcript}&rdquo;</p>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-bold text-gray-800">Overall feedback</h3>
                {speakFb.overall_band != null && (
                  <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">Band {speakFb.overall_band}</span>
                )}
              </div>
              {speakFb.detailed_feedback && (
                <p className="text-sm text-gray-700 leading-relaxed">{speakFb.detailed_feedback}</p>
              )}
            </div>

            {speakFb.subscores && (() => {
              const sub = speakFb.subscores as Record<string, number>;
              const primaryOrder = Object.keys(SPEAKING_SUBSCORE_META);
              const keys = [
                ...primaryOrder.filter(k => sub[k] != null && !Number.isNaN(Number(sub[k]))),
                ...Object.keys(sub).filter(k => !primaryOrder.includes(k)),
              ];
              if (keys.length === 0) return null;
              return (
                <>
                  <h2 className="text-lg font-bold text-gray-800">Ratings by criterion</h2>
                  {keys.map((key, idx) => {
                    const band = Number(sub[key]);
                    const meta = SPEAKING_SUBSCORE_META[key] || {
                      label: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                      rule: "This score reflects how well your spoken response meets CELPIP-style expectations in this area.",
                    };
                    return (
                      <div key={key} className="bg-white border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-purple-500">
                              {idx + 1}
                            </span>
                            <p className="text-sm font-semibold text-gray-800">{meta.label}</p>
                          </div>
                          <span className={"text-lg font-bold tabular-nums " + bandAccentClass(band)}>
                            {band}<span className="text-gray-400 text-sm font-semibold"> /12</span>
                          </span>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4">
                          <p className="text-xs font-bold text-yellow-800 mb-1">💡 How this is scored</p>
                          <p className="text-xs text-yellow-800 leading-relaxed">{meta.rule}</p>
                        </div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Your score</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          Practice band <strong className={bandAccentClass(band)}>{band}</strong> out of 12 for this dimension.
                        </p>
                      </div>
                    );
                  })}
                </>
              );
            })()}

            {speakFb.strengths && speakFb.strengths.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-gray-800 mb-3">Strengths</p>
                <ul className="space-y-2">
                  {speakFb.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                      <span className="text-green-600 flex-shrink-0 font-bold">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {speakFb.areas_to_improve && speakFb.areas_to_improve.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-gray-800 mb-3">Areas to improve</p>
                <ul className="space-y-2">
                  {speakFb.areas_to_improve.map((imp: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-orange-500 flex-shrink-0">→</span>{imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {speakFb.sample_improved_response != null && String(speakFb.sample_improved_response).trim() !== "" && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-gray-800 mb-3">Sample improved response</p>
                <p className="text-sm text-purple-900 leading-relaxed bg-purple-50 border border-purple-100 rounded-xl p-4 whitespace-pre-wrap">
                  {speakFb.sample_improved_response}
                </p>
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
          <Link href={retakeHref} className={"flex-1 text-center py-3 rounded-xl text-white font-semibold text-sm transition " + sectionStyle.btn}>
            Re-take
          </Link>
          <Link href={sectionStyle.back} className="flex-1 text-center py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">
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
