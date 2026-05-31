import Anthropic from "@anthropic-ai/sdk";
import { ensureReadingPassageLabels } from "./reading-passage-format";
import { parseLlmJsonWithRepair } from "./reading-llm-json";
import {
  buildReadingPart3PassagePrompt,
  buildReadingPart3QuestionsPrompt,
  buildReadingPart4PassagePrompt,
  buildReadingPart4QuestionsPrompt,
} from "./reading-generate-prompts";

const SYSTEM =
  "You are a certified CELPIP examiner. Return raw JSON only. No markdown. No backticks. No explanation.";

type PassagePayload = {
  reading_type?: string;
  time_limit_minutes?: number;
  title?: string;
  passage?: string;
};

type QuestionsPayload = {
  questions?: unknown[];
  fill_in_blank?: unknown;
};

async function callReadingLlm(
  client: Anthropic,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    temperature: 0.7,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

export async function generateReadingPart3(
  client: Anthropic,
  questionCount: number,
): Promise<Record<string, unknown>> {
  const passageText = await callReadingLlm(
    client,
    buildReadingPart3PassagePrompt(),
    3500,
  );
  const passagePart = await parseLlmJsonWithRepair<PassagePayload>(
    client,
    passageText,
  );

  if (!passagePart.passage || !passagePart.title) {
    throw new Error("Part 3 passage generation missing title or passage");
  }

  passagePart.passage = ensureReadingPassageLabels(passagePart.passage);

  const questionsText = await callReadingLlm(
    client,
    buildReadingPart3QuestionsPrompt(
      passagePart.title,
      passagePart.passage,
      questionCount,
    ),
    3500,
  );
  const questionsPart = await parseLlmJsonWithRepair<QuestionsPayload>(
    client,
    questionsText,
  );

  return {
    reading_type: "Reading for Information",
    time_limit_minutes: passagePart.time_limit_minutes ?? 10,
    title: passagePart.title,
    passage: passagePart.passage,
    questions: questionsPart.questions ?? [],
  };
}

export async function generateReadingPart4(
  client: Anthropic,
): Promise<Record<string, unknown>> {
  const passageText = await callReadingLlm(
    client,
    buildReadingPart4PassagePrompt(),
    4000,
  );
  const passagePart = await parseLlmJsonWithRepair<PassagePayload>(
    client,
    passageText,
  );

  if (!passagePart.passage || !passagePart.title) {
    throw new Error("Part 4 passage generation missing title or passage");
  }

  passagePart.passage = ensureReadingPassageLabels(passagePart.passage);

  const questionsText = await callReadingLlm(
    client,
    buildReadingPart4QuestionsPrompt(passagePart.title, passagePart.passage),
    4500,
  );
  const questionsPart = await parseLlmJsonWithRepair<QuestionsPayload>(
    client,
    questionsText,
  );

  return {
    reading_type: "Reading for Viewpoints",
    time_limit_minutes: passagePart.time_limit_minutes ?? 13,
    title: passagePart.title,
    passage: passagePart.passage,
    questions: questionsPart.questions ?? [],
    fill_in_blank: questionsPart.fill_in_blank,
  };
}
