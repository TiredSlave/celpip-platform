import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskType = body.taskType || "Writing Task 1";

    // Different prompt based on task type
    const prompt = taskType === "Writing Task 2"
      ? `Generate a CELPIP Writing Task 2 survey response question.
         Return a raw JSON object with exactly these keys:
         task_type, topic, question, opinion_options 
         (array of 2 opposite opinions to choose from),
         word_limit, time_limit_minutes.`
      : `Generate a CELPIP Writing Task 1 email scenario.
         Return a raw JSON object with exactly these keys:
         task_type, scenario, instructions,
         bullet_points (array of 4 strings),
         word_limit, time_limit_minutes.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a certified CELPIP examiner. Generate realistic
               original mock test tasks matching the official CELPIP format
               exactly. Return raw JSON only. No markdown. No backticks.
               No explanation. Just the JSON object.`,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const text = response.content[0].text;
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const task = JSON.parse(cleaned);
    return NextResponse.json(task);

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}