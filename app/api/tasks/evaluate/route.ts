import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskPrompt, userResponse, taskType, userId } = body;

    // Get auth token from request headers
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";

    console.log("User ID received:", userId);
    console.log("Token received:", token ? "yes" : "no");

    const rubric = taskType === "Writing Task 2"
      ? `Task Fulfillment, Coherence, Vocabulary, Grammar`
      : `Task Fulfillment, Coherence, Vocabulary, Grammar`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: `You are a certified CELPIP examiner scoring a ${taskType} response.
               Use the official CELPIP scoring rubric with bands from 1 to 12.
               Respond with a raw JSON object only. No markdown. No backticks.`,
      messages: [
        {
          role: "user",
          content: `Evaluate this CELPIP ${taskType} response.

Task: ${taskPrompt}
User response: ${userResponse}

Return JSON with exactly these keys:
overall_band, subscores (object with task_fulfillment, coherence,
vocabulary, grammar), strengths (array of 2 strings),
areas_to_improve (array of 2 strings),
detailed_feedback (string),
sample_improved_sentence (string).`
        }
      ]
    });

    const text = response.content[0].text;
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const evaluation = JSON.parse(cleaned);

    // Save to database using user's auth token
    if (userId && token) {
      console.log("Attempting to save to database...");

      // Create supabase client with user's token
      const supabaseUser = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );

      const { data, error } = await supabaseUser.from("attempts").insert({
        user_id: userId,
        task_type: taskType,
        task_prompt: taskPrompt,
        user_response: userResponse,
        overall_band: evaluation.overall_band,
        subscores: evaluation.subscores,
        strengths: evaluation.strengths,
        areas_to_improve: evaluation.areas_to_improve,
        detailed_feedback: evaluation.detailed_feedback,
        sample_improved_sentence: evaluation.sample_improved_sentence
      });

      console.log("Save result:", data);
      console.log("Save error:", error);
    } else {
      console.log("No user ID or token - not saving");
    }

    return NextResponse.json(evaluation);

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}