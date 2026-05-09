import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

const partConfig: Record<string, { questions: number; speakers: string; audioLength: string; description: string }> = {
  "Problem Solving": {
    questions: 8,
    speakers: "2 speakers (dialogue)",
    audioLength: "1.5-2.5 minutes",
    description: "Two people discussing and solving an everyday problem"
  },
  "Daily Life Conversation": {
    questions: 5,
    speakers: "2 speakers (short dialogue)",
    audioLength: "1-1.5 minutes",
    description: "Short casual conversation about everyday topics"
  },
  "Listening for Information": {
    questions: 6,
    speakers: "2 speakers with one giving instructions",
    audioLength: "1.5-2 minutes",
    description: "One person giving information, directions or instructions to another"
  },
  "News Item": {
    questions: 5,
    speakers: "1 speaker (news reporter)",
    audioLength: "1-1.5 minutes",
    description: "A formal news-style report on a Canadian community topic"
  },
  "Discussion": {
    questions: 8,
    speakers: "3-4 speakers sharing opinions",
    audioLength: "2.5-3.5 minutes",
    description: "Multiple people discussing different viewpoints on a topic"
  },
  "Viewpoints": {
    questions: 6,
    speakers: "1-2 speakers presenting viewpoints",
    audioLength: "2-3 minutes",
    description: "Speaker(s) presenting and defending a viewpoint with evidence"
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const listeningType = body.listeningType || "Daily Life Conversation";
    const config = partConfig[listeningType] || partConfig["Daily Life Conversation"];

    let dialogueInstruction = "";
    let questionInstruction = "";

    if (listeningType === "Problem Solving") {
      dialogueInstruction = `Create a dialogue with ${config.speakers}. The conversation should be split into 3 sections (like 3 audio clips). Include a problem being raised, discussed, and resolved. Total length simulates ${config.audioLength}. Use 15-20 dialogue exchanges.`;
      questionInstruction = `Generate exactly ${config.questions} questions (split as questions 1-3 for section 1, 4-6 for section 2, 7-8 for section 3). Add a "section" field (1, 2, or 3) to each question.`;
    } else if (listeningType === "News Item") {
      dialogueInstruction = `Create a news report with a single news anchor. No dialogue - just a monologue news script. Length simulates ${config.audioLength}. Use formal news language. Cover a Canadian community topic like local infrastructure, environmental initiative, or public program. Use 8-12 sentences.`;
      questionInstruction = `Generate exactly ${config.questions} questions testing comprehension of specific facts, statistics, and main points from the news report.`;
    } else if (listeningType === "Discussion") {
      dialogueInstruction = `Create a discussion with 3 speakers (names: Host, Speaker 1, Speaker 2). They discuss different viewpoints on a Canadian topic. Length simulates ${config.audioLength}. Use 20-25 dialogue exchanges. Each speaker should express distinct opinions.`;
      questionInstruction = `Generate exactly ${config.questions} questions testing who said what, areas of agreement/disagreement, and specific details.`;
    } else if (listeningType === "Viewpoints") {
      dialogueInstruction = `Create a monologue or interview with 1-2 speakers presenting and defending viewpoints on a topic. Length simulates ${config.audioLength}. Use 10-15 dialogue exchanges or monologue sentences. Include evidence and examples to support viewpoints.`;
      questionInstruction = `Generate exactly ${config.questions} questions testing comprehension of the main viewpoint, supporting evidence, and implied meaning.`;
    } else if (listeningType === "Listening for Information") {
      dialogueInstruction = `Create a dialogue with 2 speakers where one gives detailed information, directions, or instructions to another (e.g. explaining how to use a service, giving directions, describing a schedule). Length simulates ${config.audioLength}. Use 12-16 dialogue exchanges.`;
      questionInstruction = `Generate exactly ${config.questions} questions testing ability to extract specific information, follow instructions, and understand sequence.`;
    } else {
      dialogueInstruction = `Create a short casual dialogue with 2 speakers about an everyday Canadian topic. Length simulates ${config.audioLength}. Use 8-12 dialogue exchanges.`;
      questionInstruction = `Generate exactly ${config.questions} questions testing main idea, specific details, and simple inference.`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: `You are a certified CELPIP examiner. Generate realistic CELPIP Listening test tasks. Return raw JSON only. No markdown. No backticks. No explanation.`,
      messages: [{
        role: "user",
        content: `Generate a CELPIP Listening Part: "${listeningType}".
Description: ${config.description}

${dialogueInstruction}

Return JSON:
{
  "listening_type": "${listeningType}",
  "part_description": "${config.description}",
  "audio_length": "${config.audioLength}",
  "title": "title of the listening passage",
  "dialogue": [
    {"speaker": "Speaker Name", "text": "what they say"}
  ],
  "questions": [
    {
      "id": 1,
      "question": "question text",
      "options": {
        "A": "option A",
        "B": "option B",
        "C": "option C",
        "D": "option D"
      },
      "correct_answer": "A",
      "explanation": "why this is correct and where in the dialogue it is found"
    }
  ]
}

${questionInstruction}
Use realistic Canadian names, places, and everyday situations.
Questions must be answerable ONLY from the dialogue content.`
      }]
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const listening = JSON.parse(cleaned);
    return NextResponse.json(listening);

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
