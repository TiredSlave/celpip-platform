import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function regenerateSampleAnswerForTaskWithImage(task: Record<string, unknown>) {
  try {
    const taskNumber = Number(task?.task_number);
    const taskType = String(task?.task_type || "");
    const optionA = task?.option_a as Record<string, unknown> | undefined;
    const optionB = task?.option_b as Record<string, unknown> | undefined;
    const imageContext =
      taskNumber === 5
        ? {
            option_a: {
              label: optionA?.label,
              image_prompt: optionA?.image_prompt,
              facts: optionA?.facts,
            },
            option_b: {
              label: optionB?.label,
              image_prompt: optionB?.image_prompt,
              facts: optionB?.facts,
            },
            person_to_persuade: task?.person_to_persuade,
            prompt: task?.prompt,
          }
        : {
            image_prompt: task?.visual_description || task?.image_prompt,
            prompt: task?.prompt,
            situation: task?.situation,
            scene_summary: task?.scene_summary,
          };

    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      temperature: 0.35,
      system:
        "You are a CELPIP examiner. Return raw JSON only. No markdown. No backticks. Do not invent visual details beyond the provided image_prompt and facts.",
      messages: [
        {
          role: "user",
          content: `Rewrite ONLY the sample_answer so it matches the picture STRICTLY.

Task number: ${taskNumber}
Task type: ${taskType}

Image context (ground truth — do not add details not implied here):
${JSON.stringify(imageContext)}

Rules:
- The response must sound like natural spoken English (conversational), ~130-160 words.
- Mention only concrete details that are explicitly implied by the image_prompt (and option facts for task 5).
- For task 3 and 8: include at least 8 distinct visual details (people, actions, props, background).
- If task 5: choose A or B; describe the chosen place/product/layout (objects, space, features); use at least 2 facts from the chosen option; people are optional.
- Do NOT mention text in the picture (signs, readable writing).
- For task 8: describe only the human-centered unusual situation from the image_prompt; do not invent pets or animals.

Return ONLY raw JSON for the sample answer:
For task 5:
{ "chosen_option": "A|B", "response": "...", "band": 9, "analysis": { "choice": "...", "description": "...", "persuasion": "...", "contrast": "...", "language_used": "..." } }

For other tasks:
{ "response": "...", "band": 9, "analysis": { "description_points": "short bullet-like sentence listing 4-6 things described", "organization": "...", "vocabulary": "..." } }`,
        },
      ],
    });

    const block = resp.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("regenerateSampleAnswerForTaskWithImage error:", e);
    return null;
  }
}
