import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskNumber = body.taskNumber || 1;

    const taskDescriptions: Record<number, string> = {
      1: "Give advice to a friend about a situation",
      2: "Talk about a personal experience",
      3: "Describe a picture or scene",
      4: "Make predictions about a situation",
      5: "Compare two options and choose one",
      6: "Deal with a difficult situation",
      7: "Express your opinion on a topic",
      8: "Describe an unusual situation"
    };

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a certified CELPIP examiner. Generate realistic
               CELPIP Speaking test tasks. Return raw JSON only.
               No markdown. No backticks. No explanation.`,
      messages: [
        {
          role: "user",
          content: `Generate a CELPIP Speaking Task ${taskNumber}.
          Task type: ${taskDescriptions[taskNumber]}

          Return JSON with exactly these keys:
          {
            "task_number": ${taskNumber},
            "task_type": "${taskDescriptions[taskNumber]}",
            "situation": "the situation or context given to the test taker",
            "prompt": "the specific question or instruction",
            "preparation_time_seconds": 30,
            "speaking_time_seconds": 60,
            "tips": ["tip 1", "tip 2", "tip 3"]
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

    const task = JSON.parse(cleaned);
    return NextResponse.json(task);

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}