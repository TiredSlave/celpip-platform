import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questions, userAnswers, userId } = body;

    // Calculate score
    let correct = 0;
    const results = questions.map((q: any) => {
      const isCorrect = userAnswers[q.id] === q.correct_answer;
      if (isCorrect) correct++;
      return {
        id: q.id,
        question: q.question,
        user_answer: userAnswers[q.id] || "Not answered",
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation
      };
    });

    const score = correct;
    const total = questions.length;
    const percentage = Math.round((correct / total) * 100);

    // Convert to CELPIP band (approximate)
    let band = 0;
    if (percentage >= 95) band = 12;
    else if (percentage >= 88) band = 11;
    else if (percentage >= 80) band = 10;
    else if (percentage >= 72) band = 9;
    else if (percentage >= 64) band = 8;
    else if (percentage >= 56) band = 7;
    else if (percentage >= 48) band = 6;
    else if (percentage >= 40) band = 5;
    else if (percentage >= 32) band = 4;
    else if (percentage >= 24) band = 3;
    else if (percentage >= 16) band = 2;
    else band = 1;

    // Save to database if user logged in
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";

    if (userId && token) {
      const supabaseUser = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` }
          }
        }
      );

      await supabaseUser.from("attempts").insert({
        user_id: userId,
        task_type: "Reading",
        task_prompt: "Reading comprehension task",
        user_response: JSON.stringify(userAnswers),
        overall_band: band,
        subscores: { correct, total, percentage },
        strengths: [],
        areas_to_improve: [],
        detailed_feedback: `You got ${correct} out of ${total} questions correct (${percentage}%)`,
        sample_improved_sentence: ""
      });
    }

    return NextResponse.json({ score, total, percentage, band, results });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}