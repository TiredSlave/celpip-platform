import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const readingType = body.readingType || "Reading for Information";

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: `You are a certified CELPIP examiner. Generate realistic
               reading comprehension tasks matching the official CELPIP
               format exactly. Return raw JSON only. No markdown.
               No backticks. No explanation.`,
      messages: [
        {
          role: "user",
          content: `Generate a CELPIP ${readingType} task.

Return a JSON object with exactly these keys:
{
  "reading_type": "${readingType}",
  "title": "title of the passage",
  "passage": "a realistic 200-250 word passage on an everyday topic",
  "questions": [
    {
      "id": 1,
      "question": "question text",
      "options": {
        "A": "option A text",
        "B": "option B text", 
        "C": "option C text",
        "D": "option D text"
      },
      "correct_answer": "A",
      "explanation": "why this answer is correct"
    }
  ]
}

Generate exactly 5 questions. Make sure only one option is correct per question.`
        }
      ]
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const reading = JSON.parse(cleaned);
    return NextResponse.json(reading);

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}