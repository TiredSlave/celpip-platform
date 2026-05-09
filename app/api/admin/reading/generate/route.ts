import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

const questionCounts: Record<string, number> = {
  "Reading Correspondence": 11,
  "Reading to Apply Information": 8,
  "Reading for Information": 9,
  "Reading for Viewpoints": 10
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const readingType = body.readingType || "Reading for Information";
    const questionCount = questionCounts[readingType] || 9;

    if (readingType === "Reading to Apply Information") {
      return await generatePart2Task(questionCount);
    }

    let systemPrompt = "You are a certified CELPIP examiner. Return raw JSON only. No markdown. No backticks. No explanation. Follow the JSON structure EXACTLY as specified. Do not add extra keys or change the structure.";
    let userPrompt = "";

    if (readingType === "Reading Correspondence") {
      userPrompt = `Generate a CELPIP Reading Correspondence task (Part 1).
Part 1 has ONE main email AND a partial response email with fill-in-the-blank gaps.
Return JSON:
{
  "reading_type": "Reading Correspondence",
  "title": "subject of the email exchange",
  "main_message": {
    "from": "sender full name",
    "to": "recipient full name",
    "subject": "email subject line",
    "body": "200-250 word realistic Canadian everyday email. Use paragraphs."
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
    "text_with_blanks": "Full 150-200 word response email. Insert exactly 5 blanks as [BLANK_7] [BLANK_8] [BLANK_9] [BLANK_10] [BLANK_11] where vocabulary words fit naturally.",
    "blanks": [
      {
        "id": 7,
        "options": {"A": "option", "B": "option", "C": "option", "D": "option"},
        "correct_answer": "A",
        "explanation": "why this word fits here",
        "option_explanations": {"A": "why A", "B": "why B", "C": "why C", "D": "why D"}
      }
    ]
  }
}
Generate exactly 6 MCQ questions (ids 1-6) about the main email.
Generate exactly 5 fill-in-blank items (ids 7-11) in the response email.
Total = 11 items. Blanks test vocabulary in context.
CRITICAL: Do NOT include a "response_message" key. Use ONLY "fill_in_blank" for the response.
The fill_in_blank.text_with_blanks must contain exactly 5 placeholders: [BLANK_7] [BLANK_8] [BLANK_9] [BLANK_10] [BLANK_11].
Topics: workplace scheduling, community programs, rental inquiries, service complaints, event planning.`;

    } else if (readingType === "Reading for Information") {
      userPrompt = `Generate a CELPIP Reading for Information task (Part 3).
Part 3 has a longer informational passage on an everyday Canadian topic.
Return JSON:
{
  "reading_type": "Reading for Information",
  "title": "article or passage title",
  "passage": "400-500 word informational passage. Use 4-5 clear paragraphs. Cover a practical Canadian topic like community services, workplace safety, environmental programs, health initiatives, local history, or technology. Mix factual details with some inference opportunities.",
  "questions": [
    {
      "id": 1,
      "question": "question text",
      "options": {"A": "option", "B": "option", "C": "option", "D": "option"},
      "correct_answer": "A",
      "explanation": "where in the passage this answer is found"
    }
  ]
}
Generate exactly ${questionCount} questions. Mix of:
- Direct detail questions (find specific facts)
- Inference questions (what is implied)
- Vocabulary in context questions
- Main idea questions`;

    } else if (readingType === "Reading for Viewpoints") {
      userPrompt = `Generate a CELPIP Reading for Viewpoints task (Part 4).
Part 4 has a main article with multiple viewpoints AND a fill-in-blank summary paragraph.
Return JSON:
{
  "reading_type": "Reading for Viewpoints",
  "title": "article title",
  "passage": "400-500 word article presenting multiple viewpoints. Structure: intro paragraph presenting the issue, then 3-4 paragraphs each featuring a named person (with role/background) expressing their opinion with reasons. End with a brief concluding paragraph.",
  "questions": [
    {
      "id": 1,
      "question": "question about the viewpoints",
      "options": {"A": "option", "B": "option", "C": "option", "D": "option"},
      "correct_answer": "A",
      "explanation": "which part supports this answer",
      "option_explanations": {"A": "why A", "B": "why B", "C": "why C", "D": "why D"}
    }
  ],
  "fill_in_blank": {
    "instruction": "Complete the summary by filling in the blanks. Select the best choice for each blank from the dropdown.",
    "text_with_blanks": "100-120 word summary of the article with exactly 5 blanks as [BLANK_6] [BLANK_7] [BLANK_8] [BLANK_9] [BLANK_10] where vocabulary words fit naturally.",
    "blanks": [
      {
        "id": 6,
        "options": {"A": "option", "B": "option", "C": "option", "D": "option"},
        "correct_answer": "A",
        "explanation": "why this word fits here",
        "option_explanations": {"A": "why A", "B": "why B", "C": "why C", "D": "why D"}
      }
    ]
  }
}
Generate exactly 5 MCQ questions (ids 1-5) about the viewpoints article.
Generate exactly 5 fill-in-blank items (ids 6-10) in the summary paragraph.
Total = 10 items. Blanks test vocabulary in context.
Topics: urban development, public transit, remote work, environmental regulations, housing costs.`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const reading = JSON.parse(cleaned);
    return NextResponse.json(reading);

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
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
    "hotel amenities and room rates"
  ];

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    system: "You are a certified CELPIP examiner. Return raw JSON only. No markdown. No backticks. No explanation.",
    messages: [{
      role: "user",
      content: `Generate a CELPIP Reading to Apply Information task (Part 2) about "${scenario}".

Part 2 shows a visual document (flyer, schedule, or chart) alongside questions that require 
extracting and applying specific information.

Return JSON:
{
  "reading_type": "Reading to Apply Information",
  "title": "document title",
  "document_type": "flyer or schedule or chart",
  "html_content": "HTML string of the visual document",
  "questions": [
    {
      "id": 1,
      "question": "question requiring specific info from the document",
      "options": {"A": "option", "B": "option", "C": "option", "D": "option"},
      "correct_answer": "A",
      "explanation": "exactly where in the document this answer is found"
    }
  ]
}

For html_content, create a realistic professional Canadian document. Rules:
- Use ONLY inline CSS styles
- White background: style="background:white;color:#1a1a1a;font-family:Arial,sans-serif;padding:20px;max-width:750px"
- Colored header with organization name, address, phone, email
- Clear tables with borders for schedules/pricing
- Sections with headings for different categories
- Realistic Canadian details: cities, prices in CAD, phone numbers (604/416/613 area codes)
- Keep HTML under 3000 characters total

Generate exactly ${questionCount} questions testing:
- Finding specific prices, times, dates
- Comparing options or packages
- Identifying conditions, rules, or restrictions
- Determining eligibility based on criteria
- Calculating costs based on given information`
    }]
  });

  const block = response.content[0];
  const text = block.type === "text" ? block.text : "";
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const reading = JSON.parse(cleaned);
  return NextResponse.json(reading);
}
