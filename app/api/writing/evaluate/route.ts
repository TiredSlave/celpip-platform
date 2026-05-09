import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const { taskType, scenario, bulletPoints, response } = await request.json();

    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `You are a certified CELPIP examiner. Evaluate writing responses and return raw JSON only. No markdown. No backticks.`,
      messages: [{
        role: "user",
        content: `Evaluate this CELPIP ${taskType} response.

Scenario: ${scenario}
Bullet points to address: ${bulletPoints?.join(", ")}
Student response: ${response}

Return JSON:
{
  "band": 7,
  "overall": "Overall feedback in 2-3 sentences",
  "criteria": {
    "content_coherence": "feedback on content and coherence",
    "vocabulary": "feedback on vocabulary range",
    "readability": "feedback on readability and flow",
    "task_fulfillment": "did they address all bullet points?"
  },
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}`
      }]
    });

    const block = res.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return NextResponse.json(JSON.parse(cleaned));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
