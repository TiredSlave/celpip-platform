import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const listeningType = body.listeningType || "Daily Life Conversation";

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: `You are a certified CELPIP examiner. Generate realistic
               CELPIP Listening test tasks. Return raw JSON only.
               No markdown. No backticks. No explanation.`,
      messages: [
        {
          role: "user",
          content: `Generate a CELPIP Listening task about "${listeningType}".

Return a JSON object with exactly these keys:
{
  "listening_type": "${listeningType}",
  "topic": "short specific scenario label (5-14 words)",
  "title": "engaging student-facing headline",
  "dialogue": [
    {"speaker": "Person A", "text": "what they say"},
    {"speaker": "Person B", "text": "what they say"}
  ],
  "questions": [
    {
      "id": 1,
      "question": "question about the dialogue",
      "options": {
        "A": "option A",
        "B": "option B",
        "C": "option C",
        "D": "option D"
      },
      "correct_answer": "A",
      "explanation": "why this is correct"
    }
  ]
}

Rules:
- dialogue should have 6-10 exchanges between 2 speakers
- generate exactly 4 questions
- make questions test real comprehension not just memory
- use realistic everyday Canadian topics`
        }
      ]
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const listening = JSON.parse(cleaned);
    return NextResponse.json(listening);

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}