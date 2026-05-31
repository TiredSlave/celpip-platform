import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { readingTypeForGenerate } from "../../../../lib/reading-task-types";
import { parseLlmJsonWithRepair } from "../../../../lib/reading-llm-json";
import {
  generateReadingPart3,
  generateReadingPart4,
} from "../../../../lib/reading-generate-split";
import { READING_PASSAGE_JSON_RULES } from "../../../../lib/reading-generate-prompts";
import { READING_TASK1_PASSAGE } from "../../../../lib/reading-passage-constraints";

const client = new Anthropic();

const questionCounts: Record<string, number> = {
  "Reading Correspondence": 11,
  "Reading to Apply Information": 8,
  "Reading for Information": 9,
  "Reading for Viewpoints": 10,
  "task 1": 11,
  "task 2": 8,
  "task 3": 9,
  "task 4": 10,
  "Part 1 — Correspondence": 11,
  "Part 2 — Apply Information": 8,
  "Part 3 — Reading for Information": 9,
  "Part 4 — Viewpoints": 10,
  task1: 11,
  task2: 8,
  task3: 9,
  task4: 10,
};

const SYSTEM_PROMPT =
  "You are a certified CELPIP examiner. Return raw JSON only. No markdown. No backticks. No explanation. Follow the JSON structure EXACTLY. Escape newlines inside string values as \\n.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskTypeInput = body.taskType || body.readingType || "task 3";
    const readingType = readingTypeForGenerate(taskTypeInput);
    const questionCount = questionCounts[readingType] || 9;

    if (readingType === "Reading to Apply Information") {
      return await generatePart2Task(questionCount);
    }

    if (readingType === "Reading for Information") {
      const reading = await generateReadingPart3(client, questionCount);
      return NextResponse.json(reading);
    }

    if (readingType === "Reading for Viewpoints") {
      const reading = await generateReadingPart4(client);
      return NextResponse.json(reading);
    }

    if (readingType === "Reading Correspondence") {
      const userPrompt = `Generate a CELPIP Reading Correspondence task (Part 1).
Part 1 has ONE main email AND a partial response email with fill-in-the-blank gaps.
Timing and length requirements:
- Time allowed: 11 minutes.
- Total questions/items: 11.
- Main message (passage): ${READING_TASK1_PASSAGE.wordCountLabel}; ${READING_TASK1_PASSAGE.format}; ${READING_TASK1_PASSAGE.paragraphs}.
- The response fill-in-the-blank email must be about 100-150 words.

${READING_PASSAGE_JSON_RULES}

Return JSON:
{
  "reading_type": "Reading Correspondence",
  "time_limit_minutes": 11,
  "title": "subject of the email exchange",
  "main_message": {
    "from": "sender full name",
    "to": "recipient full name",
    "subject": "email subject line",
    "body": "150-250 word email body; use \\\\n between paragraphs inside this JSON string"
  },
  "questions": [
    {
      "id": 1,
      "question": "question about the main email",
      "options": {"A": "option", "B": "option", "C": "option", "D": "option"},
      "correct_answer": "A",
      "explanation": "why this is correct",
      "option_explanations": {"A": "why A", "B": "why B", "C": "why C", "D": "why D"}
    }
  ],
  "fill_in_blank": {
    "instruction": "Here is a response to the message. Complete the response by filling in the blanks. Select the best choice for each blank from the dropdown.",
    "from": "responder full name",
    "to": "original sender name",
    "subject": "Re: same subject",
    "text_with_blanks": "100-150 word response with [BLANK_7] [BLANK_8] [BLANK_9] [BLANK_10] [BLANK_11]",
    "blanks": [
      {
        "id": 7,
        "options": {"A": "single word or short phrase", "B": "single word or short phrase", "C": "single word or short phrase", "D": "single word or short phrase"},
        "correct_answer": "A",
        "explanation": "why this word fits here",
        "option_explanations": {"A": "why A", "B": "why B", "C": "why C", "D": "why D"}
      }
    ]
  }
}
Generate exactly 6 MCQ questions (ids 1-6) about the main email.
Generate exactly 5 fill-in-blank items (ids 7-11) in the response email.
CRITICAL: Do NOT include a "response_message" key. Use ONLY "fill_in_blank" for the response.
The fill_in_blank.text_with_blanks must contain exactly 5 placeholders: [BLANK_7] [BLANK_8] [BLANK_9] [BLANK_10] [BLANK_11].`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      const block = response.content[0];
      const text = block.type === "text" ? block.text : "";
      const reading = await parseLlmJsonWithRepair<Record<string, unknown>>(
        client,
        text,
      );
      return NextResponse.json(reading);
    }

    return NextResponse.json(
      { error: `Unsupported reading type: ${readingType}` },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error:", error);
    const message =
      error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generatePart2Task(questionCount: number) {
  const scenarios = [
    "fitness centre membership plans",
    "community centre recreation programs",
    "city transit schedule",
    "apartment rental listings",
    "restaurant menu and specials",
    "library services and hours",
    "job fair event schedule",
    "medical clinic services and fees",
    "recreation program registration",
    "hotel amenities and room rates",
  ];

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate a CELPIP Reading to Apply Information task (Part 2) about "${scenario}".

Part 2 shows a visual document (flyer, schedule, chart, or diagram) and an accompanying response email.
- Time allowed: 9 minutes.
- Total questions: 8.
- html_content: minimal text only, under 2200 characters.
- response_message.body: 150-200 words; use \\n between paragraphs in JSON.

${READING_PASSAGE_JSON_RULES}

Return JSON with reading_type, time_limit_minutes, title, document_type, html_content, response_message, and exactly ${questionCount} questions.`,
      },
    ],
  });

  const block = response.content[0];
  const text = block.type === "text" ? block.text : "";
  const reading = await parseLlmJsonWithRepair<Record<string, unknown>>(
    client,
    text,
  );
  return NextResponse.json(reading);
}
