import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

/** CELPIP Writing Task 1 & 2 generation for admin (and public demo callers). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskType = body.taskType || "Writing Task 1";

    let userPrompt = "";

    if (taskType === "Writing Task 2") {
      userPrompt = `Generate a CELPIP Writing Task 2 question.
Task 2 presents a situation where the test taker must choose between two options and explain their choice.
Return raw JSON only:
{
  "task_type": "Writing Task 2",
  "topic": "the survey or community topic title",
  "context": "2-3 sentence background explaining the situation requiring a decision",
  "question": "Which option do you prefer? Use specific reasons and examples to support your choice.",
  "option_a": "first option description",
  "option_b": "second contrasting option description",
  "word_limit": 200,
  "time_limit_minutes": 26,
  "sample_answer": "A 150-200 word band 9 response that clearly chooses one option, gives 2-3 specific reasons with examples, and has a clear conclusion",
  "sample_answer_band": 9,
  "sample_answer_notes": ["what makes this response strong", "vocabulary used", "structure note"]
}
Topics: workplace policies, community programs, technology use, environmental choices, education methods, housing options, transportation choices.`;

    } else {
      userPrompt = `Generate a CELPIP Writing Task 1 email scenario.
Task 1 requires writing an email with exactly 3 bullet points to address.
Return raw JSON only:
{
  "task_type": "Writing Task 1",
  "scenario": "the situation that requires writing an email",
  "recipient": "who the email is addressed to",
  "tone": "formal or semi-formal or informal",
  "instructions": "Write an email to [recipient]. In your email:",
  "bullet_points": ["first specific point to address", "second specific point to address", "third specific point to address"],
  "word_limit": 150,
  "time_limit_minutes": 27,
  "sample_answer": "A 150-200 word band 9 email that addresses all 3 bullet points with appropriate tone and greeting/sign-off",
  "sample_answer_band": 9,
  "sample_answer_notes": ["what makes this email strong", "tone and vocabulary used", "structure note"]
}
Topics: workplace scheduling, complaints to businesses, requests for information, community issues, housing problems, service feedback.`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: `You are a certified CELPIP examiner. Generate realistic original mock test tasks matching the official CELPIP format exactly. Return raw JSON only. No markdown. No backticks. No explanation.`,
      messages: [{ role: "user", content: userPrompt }],
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const task = JSON.parse(cleaned);
    return NextResponse.json(task);
  } catch (error) {
    console.error("admin writing generate:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
