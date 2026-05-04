import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questions, userAnswers, userId, token } = body;

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

    const total = questions.length;
    const percentage = Math.round((correct / total) * 100);

    let band = 1;
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

    if (userId && token) {
      const supabaseUser = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: "Bearer " + token } } }
      );

      await supabaseUser.from("attempts").insert({
        user_id: userId,
        task_type: "Listening",
        task_prompt: "Listening comprehension task",
        user_response: JSON.stringify(userAnswers),
        overall_band: band,
        subscores: { correct, total, percentage },
        strengths: [],
        areas_to_improve: [],
        detailed_feedback: "You got " + correct + " out of " + total + " questions correct (" + percentage + "%)",
        sample_improved_sentence: ""
      });
    }

    return NextResponse.json({ correct, total, percentage, band, results });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
