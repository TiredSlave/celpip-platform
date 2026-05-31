/**
 * Internal prompts for generating Task 3/4 content — admin / LLM only, not learner UI.
 */

/** LLM user prompt when generating Task 4 sample answer + metadata from a shared Task 3 picture. */
export function buildTask4AuthoringPrompt(options: {
  task3Situation: string;
  focalPoints: string[];
  predictionBrief: string;
  pictureContext: string;
  difficulty: string | undefined;
  difficultyInstruction: string;
}): string {
  const {
    task3Situation,
    focalPoints,
    predictionBrief,
    pictureContext,
    difficulty,
    difficultyInstruction,
  } = options;

  return `Generate CELPIP Speaking Task 4 (Make Predictions) content for the picture below.
This is an INTERNAL authoring prompt — the saved task must use the official learner prompt verbatim, not this text.

Difficulty: ${difficulty || "medium"} — ${difficultyInstruction}

Scene title (from Task 3): ${task3Situation}

Activities visible in the picture (for sample answer and prediction_targets only):
${focalPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Prediction targets — sample answer must predict next steps for at least THREE different activities:
${predictionBrief}

Picture (ground truth):
${pictureContext}

Hard rules:
- prediction_targets: at least three different activities/groups from the list above.
- sample_answer: plausible next events tied to visible actions (consequences), not new unrelated stories.
- Do NOT introduce agriculture, farms, farmers markets, produce stalls, or trading markets.
- Do NOT put question-setter rules or activity lists into the learner-facing "prompt" field.

Return ONLY raw JSON:
{
  "task_number": 4,
  "task_type": "Make Predictions",
  "situation": "short title for this scene",
  "prediction_targets": ["activity 1", "activity 2", "activity 3"],
  "preparation_time_seconds": 30,
  "speaking_time_seconds": 60,
  "tips": ["tip1", "tip2", "tip3"],
  "sample_answer": "band 9 spoken predictions about this exact scene",
  "sample_answer_band": 9,
  "sample_answer_notes": ["note1", "note2"]
}`;
}
