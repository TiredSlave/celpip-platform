import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transcript, taskPrompt, taskNumber, userId, token } = body;

    console.log("Transcript received:", transcript);

    if (!transcript || transcript.trim() === "") {
      return NextResponse.json(
        { error: "No transcript provided. Please try speaking again." },
        { status: 400 }
      );
    }

    console.log("Evaluating with Claude...");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: `You are a certified CELPIP Speaking examiner.
               Evaluate spoken responses using the official CELPIP
               Speaking rubric with bands from 1 to 12.
               Return raw JSON only. No markdown. No backticks.`,
      messages: [
        {
          role: "user",
          content: `Evaluate this CELPIP Speaking Task ${taskNumber} response.

Task: ${taskPrompt}

Transcript of spoken response:
"${transcript}"

Return JSON with exactly these keys:
{
  "overall_band": <1-12>,
  "subscores": {
    "coherence": <1-12>,
    "vocabulary": <1-12>,
    "grammar": <1-12>,
    "pronunciation_fluency": <1-12>
  },
  "strengths": ["strength 1", "strength 2"],
  "areas_to_improve": ["area 1", "area 2"],
  "detailed_feedback": "2-3 sentences of overall feedback",
  "sample_improved_response": "a better version of one part of their response"
}`
        }
      ]
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const evaluation = JSON.parse(cleaned);

    // Save to database if logged in
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
        task_type: `Speaking Task ${taskNumber}`,
        task_prompt: taskPrompt,
        user_response: transcript,
        overall_band: evaluation.overall_band,
        subscores: evaluation.subscores,
        strengths: evaluation.strengths,
        areas_to_improve: evaluation.areas_to_improve,
        detailed_feedback: evaluation.detailed_feedback,
        sample_improved_sentence: evaluation.sample_improved_response
      });
    }

    return NextResponse.json({ transcript, evaluation });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}