import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

type WritingContent = {
  scenario?: string;
  instructions?: string;
  bullet_points?: string[];
  topic?: string;
  context?: string;
  question?: string;
  option_a?: string;
  option_b?: string;
  opinion_options?: string[];
  word_limit?: number;
  time_limit_minutes?: number;
  recipient?: string;
  tone?: string;
};

function buildTask2ChoiceBlock(
  selectedOption: "A" | "B" | undefined,
  chosenOptionText: string | undefined,
) {
  if (!selectedOption || !chosenOptionText?.trim()) {
    return "";
  }
  return `

---

## Candidate's declared choice (Task 2 — use this for scoring)

The candidate **selected Option ${selectedOption}** in the test interface before writing. They committed to defending this option:

**Option ${selectedOption} (full wording):**  
${chosenOptionText}

**Your job:** Score the essay as an argument **for Option ${selectedOption}** only.  
- If the response clearly supports Option ${selectedOption} with reasons and examples, task_fulfillment can be high.  
- If the response mainly supports the *other* option, is neutral without a clear commitment, or contradicts Option ${selectedOption}, **lower task_fulfillment and overall band** accordingly and say so in your feedback.`;
}

function buildTaskBlockForExaminer(taskType: string, content: WritingContent | undefined, scenario: string | undefined, bulletPoints: string[] | undefined) {
  const c = content || {};
  const isTask2 =
    taskType === "Writing Task 2" ||
    (c.topic != null && String(c.topic).trim() !== "" && (c.option_a != null || c.option_b != null || (c.opinion_options && c.opinion_options.length >= 2)));

  if (isTask2) {
    const optA = c.option_a ?? c.opinion_options?.[0] ?? "";
    const optB = c.option_b ?? c.opinion_options?.[1] ?? "";
    const wordLimit = c.word_limit ?? 200;
    return `## CELPIP Writing Task 2 — full prompt (as the candidate saw it)

**Topic:** ${c.topic ?? "(not specified)"}

**Background / situation:** ${c.context ?? "(not specified)"}

**Question the candidate must answer in writing:** ${c.question ?? "(not specified)"}

**Option A:** ${optA}

**Option B:** ${optB}

**Target length:** about ${wordLimit} words (CELPIP Task 2 is typically ~150–${wordLimit} words).

In the real test interface, the candidate must **choose either A or B** before writing, then write a passage defending **only that choice**. You will be told their choice in the next section.`;
  }

  const bullets = (bulletPoints && bulletPoints.length > 0)
    ? bulletPoints
    : (c.bullet_points || []);
  const scen = scenario ?? c.scenario ?? "";
  const instr = c.instructions ? `\n**Instructions:** ${c.instructions}` : "";
  const recipient = c.recipient;
  const tone = c.tone;
  const meta = [recipient && `**Recipient:** ${recipient}`, tone && `**Expected tone:** ${tone}`].filter(Boolean).join("\n");

  return `## CELPIP Writing Task 1 — full prompt (as the candidate saw it)

**Scenario:** ${scen}${instr}
${meta ? "\n" + meta : ""}

**Bullet points the candidate must address in the email:**
${bullets.length ? bullets.map((b, i) => `${i + 1}. ${b}`).join("\n") : "(none listed — evaluate based on scenario only.)"}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskType, response, content, selectedOption, chosenOptionText } = body as {
      taskType: string;
      response: string;
      content?: WritingContent;
      scenario?: string;
      bulletPoints?: string[];
      selectedOption?: "A" | "B";
      chosenOptionText?: string;
    };

    const scenario = body.scenario ?? content?.scenario;
    const bulletPoints = body.bulletPoints ?? content?.bullet_points;

    if (taskType === "Writing Task 2" && (!selectedOption || !["A", "B"].includes(selectedOption) || !String(chosenOptionText || "").trim())) {
      return NextResponse.json(
        { error: "Writing Task 2 requires selectedOption (A or B) and chosenOptionText matching the task options." },
        { status: 400 },
      );
    }

    const taskBlock = buildTaskBlockForExaminer(taskType, content, scenario, bulletPoints);
    const choiceBlock = taskType === "Writing Task 2" ? buildTask2ChoiceBlock(selectedOption, chosenOptionText) : "";

    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `You are a certified CELPIP examiner. You will be given the FULL task wording exactly as the candidate saw it, their declared choice for Task 2 (if applicable), then their response. Evaluate fairly against that task and declared choice. Return raw JSON only. No markdown. No backticks.`,
      messages: [{
        role: "user",
        content: `${taskBlock}${choiceBlock}

---

## Candidate response (their written passage)

${response}

---

Return JSON:
{
  "band": 7,
  "overall": "Overall feedback in 2-3 sentences",
  "criteria": {
    "content_coherence": "feedback on content and coherence",
    "vocabulary": "feedback on vocabulary range",
    "readability": "feedback on readability and flow",
    "task_fulfillment": "For Task 2: did they defend their DECLARED option (A or B) with clear reasons and examples? Penalize if they mainly argued for the other side or never committed. For Task 1: did they address all bullet points?"
  },
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}`,
      }],
    });

    const block = res.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return NextResponse.json(JSON.parse(cleaned));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
