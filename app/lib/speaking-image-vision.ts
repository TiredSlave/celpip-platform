/**
 * Vision checks and content alignment for speaking task images.
 * Task 8: checkTask8Image is defined once below (do not duplicate).
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  SPEAKING_TASK34_REQUIREMENT_PROMPT,
  SPEAKING_TASK4_LEARNER_PROMPT,
} from "./speaking-task34-requirement";
import { TASK34_ACTION_CATEGORY_EXAMPLES } from "./speaking-task34-diversity";

const client = new Anthropic();

const MIN_TASK34_ACTIVITIES = 5;

/** Shared vision rule — reject when 2+ groups share one action category. */
const TASK34_ACTION_CATEGORY_VISION_RULE = `- activities_diverse: Assign each visible activity group ONE action category. ${TASK34_ACTION_CATEGORY_EXAMPLES} Set FALSE only when 2+ groups clearly share desk/study (typing, writing, reading at desk/table as the main action) OR idle socializing. Jumping, mopping, paying, eating ice cream, scanning groceries, carrying bags are DIFFERENT categories — do NOT lump them together. Set TRUE when 5 groups show visibly different action types in one scene.`;

export type Task34ImageCheckResult = {
  count: number;
  singleScene: boolean;
  singleSnapshot: boolean;
  activitiesDiverse: boolean;
  equalFocus: boolean;
  clearComposition: boolean;
  actionableActivities: boolean;
  acceptable: boolean;
  notes?: string;
};

export type Task34ImageCheckOptions = {
  /** Planned activities — vision counts each separately if visible. */
  expectedActivities?: string[];
};

/** Vision check: one scene? how many independent activities in that scene? */
export async function checkTask34Image(
  imageBase64: string,
  options?: Task34ImageCheckOptions,
): Promise<Task34ImageCheckResult> {
  const expectedBlock =
    options?.expectedActivities?.length ?
      `\nReference script (for notes only — image does NOT need to match these exactly):\n${options.expectedActivities.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
    : "";

  const countingRules = `- activity_count: Count DISTINCT groups of PEOPLE doing different actions (target exactly 5). If no people are visible, activity_count MUST be 0.
${TASK34_ACTION_CATEGORY_VISION_RULE}
- actionable_activities: false if no people visible, OR if most groups are idle/socializing/standing with nothing to describe (children chatting, people milling). true if each group shows a clear purposeful verb (paying, jumping, carrying, fixing, eating, teaching, cleaning).`;

  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 280,
      temperature: 0,
      system: "Return raw JSON only. No markdown.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `CELPIP Speaking Task 3/4 cartoon. Required: ${SPEAKING_TASK34_REQUIREMENT_PROMPT}
${expectedBlock}

Return JSON only:
{"activity_count": <integer 0-6>, "single_scene": <true or false>, "single_snapshot": <true or false>, "activities_diverse": <true or false>, "equal_focus": <true or false>, "clear_composition": <true or false>, "actionable_activities": <true or false>, "notes": "one short sentence"}

Rules:
- single_scene: one continuous place.
- single_snapshot: false if ANY panel borders, film strip layout, side-by-side duplicate rooms, or same place at different times. true only for ONE unified photograph.
${countingRules}
- equal_focus: true if most activity groups are easy to spot; false only if one giant group dominates and others are tiny or missing.
- clear_composition: false if overcrowded, messy, chaotic, OR empty scene with no people (vacant patio, furniture only). true if simple readable cartoon with 5 clear groups of people and open space.
- actionable_activities: false if no people visible, OR if most groups are idle/socializing/standing with nothing to describe. true if most visible groups show a clear purposeful action in progress.`,
            },
          ],
        },
      ],
    });

    const block = resp.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      activity_count?: number;
      single_scene?: boolean;
      single_snapshot?: boolean;
      activities_diverse?: boolean;
      equal_focus?: boolean;
      clear_composition?: boolean;
      actionable_activities?: boolean;
      notes?: string;
    };
    const count = Math.max(0, Math.min(6, Number(parsed.activity_count) || 0));
    const singleScene = parsed.single_scene !== false;
    const singleSnapshot = parsed.single_snapshot !== false;
    const activitiesDiverse = parsed.activities_diverse !== false;
    const equalFocus = parsed.equal_focus !== false;
    const clearComposition = parsed.clear_composition !== false;
    const actionableActivities = parsed.actionable_activities !== false;
    return {
      count,
      singleScene,
      singleSnapshot,
      activitiesDiverse,
      equalFocus,
      clearComposition,
      actionableActivities,
      acceptable:
        singleScene &&
        singleSnapshot &&
        activitiesDiverse &&
        equalFocus &&
        clearComposition &&
        actionableActivities &&
        count >= MIN_TASK34_ACTIVITIES,
      notes: parsed.notes,
    };
  } catch (e) {
    console.error("checkTask34Image error:", e);
    return {
      count: 0,
      singleScene: true,
      singleSnapshot: true,
      activitiesDiverse: true,
      equalFocus: true,
      clearComposition: true,
      actionableActivities: true,
      acceptable: true,
    };
  }
}

/** @deprecated Use checkTask34Image */
export async function countIndependentActivitiesInImage(
  imageBase64: string,
): Promise<{ count: number; acceptable: boolean }> {
  const r = await checkTask34Image(imageBase64);
  return { count: r.count, acceptable: r.acceptable };
}

export type SingleSnapshotCheckResult = {
  singleSnapshot: boolean;
  notes?: string;
};

/**
 * Lightweight gate for Tasks 5 & 8 — ONE photograph, not comic panels.
 * (Task 3/4 use checkTask34Image which includes the same single_snapshot rule.)
 */
export async function checkSingleSnapshotImage(
  imageBase64: string,
  taskLabel: string,
): Promise<SingleSnapshotCheckResult> {
  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 120,
      temperature: 0,
      system: "Return raw JSON only. No markdown.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `${taskLabel} — CELPIP flat illustration.

Return JSON only: {"single_snapshot": true or false, "notes": "one short sentence"}

Rules for single_snapshot:
- FALSE if the image shows a grid of repeated panels (2x2, 3x3, 3x6, comic page, manga page, storyboard, film strip, or any layout with visible gutters between separate frames).
- FALSE if the same scene repeats in multiple boxes.
- TRUE only for ONE unified illustration filling the frame — one outer border around the whole scene is OK.`,
            },
          ],
        },
      ],
    });

    const block = resp.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      single_snapshot?: boolean;
      notes?: string;
    };
    return {
      singleSnapshot: parsed.single_snapshot !== false,
      notes: parsed.notes,
    };
  } catch (e) {
    console.error("checkSingleSnapshotImage error:", e);
    return {
      singleSnapshot: false,
      notes: "Vision check failed — reject and retry",
    };
  }
}

export type Task8ImageCheckResult = {
  singleSnapshot: boolean;
  absurdUnusual: boolean;
  acceptable: boolean;
  notes?: string;
};

/**
 * Task 8 gate: one unified cartoon AND absurd wrong-place content (not a normal meeting / routine scene).
 */
export async function checkTask8Image(
  imageBase64: string,
  expectedScene?: { scene: string; whyUnusual: string },
): Promise<Task8ImageCheckResult> {
  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      temperature: 0,
      system: "Return raw JSON only. No markdown.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `CELPIP Speaking Task 8 — check this generated practice picture.

${expectedScene ? `We intended: ${expectedScene.scene}\nMust be absurd because: ${expectedScene.whyUnusual}` : ""}

Return JSON only:
{"single_snapshot": true or false, "absurd_unusual": true or false, "notes": "one short sentence"}

Rules:
- single_snapshot: FALSE if ANY grid of panels, comic strip page, manga page, storyboard, multiple frames with gutters, or repeated scenes in boxes (e.g. 6-panel or 18-panel grid). TRUE only for ONE unified illustration.
- absurd_unusual: TRUE only if the main action is clearly UNIMAGINABLE wrong-place absurd (horse in office, car wash in living room). FALSE for normal meetings, routine office work, everyday scenes with nothing shocking.`,
            },
          ],
        },
      ],
    });

    const block = resp.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      single_snapshot?: boolean;
      absurd_unusual?: boolean;
      notes?: string;
    };

    const singleSnapshot = parsed.single_snapshot !== false;
    const absurdUnusual = parsed.absurd_unusual === true;

    return {
      singleSnapshot,
      absurdUnusual,
      acceptable: singleSnapshot && absurdUnusual,
      notes: parsed.notes,
    };
  } catch (e) {
    console.error("checkTask8Image error:", e);
    return {
      singleSnapshot: false,
      absurdUnusual: false,
      acceptable: false,
      notes: "Vision check failed",
    };
  }
}

export type Task5ImageCheckResult = {
  singleSnapshot: boolean;
  matchesExpected: boolean;
  acceptable: boolean;
  notes?: string;
};

/** Fast vision gate for Task 5 — one photograph of one option, not panels. */
export async function checkTask5OptionImage(
  imageBase64: string,
  side: "A" | "B",
  expectedLabel: string,
): Promise<Task5ImageCheckResult> {
  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 180,
      temperature: 0,
      system: "Return raw JSON only. No markdown.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `CELPIP Speaking Task 5 option picture ${side}. Expected option type: ${expectedLabel}

Return JSON only:
{"single_snapshot": <true or false>, "matches_expected": <true or false>, "notes": "one short sentence"}

Rules:
- single_snapshot: false if ANY panel borders, comic strip, storyboard, film strip, collage, side-by-side duplicate rooms, or multiple snapshots. true only for ONE unified photograph.
- matches_expected: true if image shows the same general option type as expected (room, vehicle, product, venue) — not a random unrelated scene or social crowd.`,
            },
          ],
        },
      ],
    });

    const block = resp.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      single_snapshot?: boolean;
      matches_expected?: boolean;
      notes?: string;
    };
    const singleSnapshot = parsed.single_snapshot !== false;
    const matchesExpected = parsed.matches_expected !== false;
    return {
      singleSnapshot,
      matchesExpected,
      acceptable: singleSnapshot && matchesExpected,
      notes: parsed.notes,
    };
  } catch (e) {
    console.error("checkTask5OptionImage error:", e);
    return {
      singleSnapshot: false,
      matchesExpected: false,
      acceptable: false,
      notes: "Vision check failed — retry",
    };
  }
}

export type Task34VisionAlignResult = {
  situation: string;
  focal_points: string[];
  visual_description: string;
  sample_answer: string;
  sample_answer_band: number;
};

/** Read the generated cartoon and write Task 3 situation + sample answer from pixels. */
export async function alignTask34ContentToImage(
  imageBase64: string,
  expectedFocalPoints?: string[],
): Promise<Task34VisionAlignResult | null> {
  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      temperature: 0.2,
      system:
        "You are a CELPIP Speaking examiner. Return raw JSON only. No markdown. No backticks.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `CELPIP Speaking Task 3/4. Required: ${SPEAKING_TASK34_REQUIREMENT_PROMPT}

${expectedFocalPoints?.length ? `Planned activities in this one scene (list each ONLY if visible in the same place):\n${expectedFocalPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}` : ""}

Look at the ACTUAL image and return JSON describing ONLY what is visibly drawn:
{
  "situation": "short title (5-12 words) naming the one place / scene",
  "focal_points": ["4-5 items — each a different purposeful activity in this scene"],
  "visual_description": "one paragraph: name the scene, then each of 4-5 activities with balanced detail — not only one",
  "sample_answer": "natural spoken band 9 response, 120-150 words: the place, then each affair a test taker can describe and predict",
  "sample_answer_band": 9
}

Rules:
- One scene only — all activities must be in the same continuous location.
- focal_points: 4-5 different affairs visible in the scene; each an obvious action a test taker can describe and predict.
- Do NOT list idle waiting, reading alone, or static objects without people acting.
- Each focal point = one different action/group in the same place, not interacting across groups.
- Do not describe split panels, different buildings, or different scenes.
- Ground every detail in what you SEE in the image.
- Do not mention readable text on signs or labels.
- Do not invent people, actions, or objects that are not visible.`,
            },
          ],
        },
      ],
    });

    const block = resp.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Task34VisionAlignResult;

    if (
      !parsed.situation ||
      !parsed.sample_answer ||
      typeof parsed.visual_description !== "string"
    ) {
      return null;
    }

    const focal_points = Array.isArray(parsed.focal_points)
      ? parsed.focal_points.map((p) => String(p).trim()).filter(Boolean)
      : [];

    return {
      situation: String(parsed.situation).trim(),
      focal_points,
      visual_description: String(parsed.visual_description).trim(),
      sample_answer: String(parsed.sample_answer).trim(),
      sample_answer_band: Number(parsed.sample_answer_band) || 9,
    };
  } catch (e) {
    console.error("alignTask34ContentToImage error:", e);
    return null;
  }
}

export type Task8VisionAlignResult = {
  situation: string;
  scene_summary: string;
  visual_description: string;
  sample_answer: string;
  sample_answer_band: number;
  single_snapshot: boolean;
  absurd_unusual: boolean;
};

/** Read the generated cartoon and write situation + sample answer from pixels, not the text prompt. */
export async function alignTask8ContentToImage(
  imageBase64: string,
  expectedScene?: { title: string; scene: string; whyUnusual: string },
): Promise<Task8VisionAlignResult | null> {
  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      temperature: 0.2,
      system:
        "You are a CELPIP Speaking examiner. Return raw JSON only. No markdown. No backticks.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `This is a CELPIP Speaking Task 8 editorial cartoon (describe an UNUSUAL situation).

In the real CELPIP test, "unusual" means UNIMAGINABLE — an absurd wrong object or action in a completely wrong place (horse in an office, car wash in a living room). It is NOT merely rare, seasonal, or slightly uncommon.

${expectedScene ? `Expected absurd moment: ${expectedScene.scene}\nWhy it must look unimaginable: ${expectedScene.whyUnusual}` : ""}

Look at the ACTUAL image and return JSON describing ONLY what is visibly drawn:
{
  "situation": "short title (5-12 words) for the unusual situation shown",
  "scene_summary": "one sentence explaining WHY this is unimaginable / absurd (wrong place or wrong context)",
  "visual_description": "8-10 concrete visual facts: the bizarre action, setting, and bystander reactions",
  "sample_answer": "natural spoken band 9 response, 130-160 words: describe the picture, clearly explain why it is unimaginable and absurd, and what likely happened just before",
  "sample_answer_band": 9,
  "single_snapshot": true or false,
  "absurd_unusual": true or false
}

Rules:
- single_snapshot: false if comic strip page, panel grid, storyboard, or multiple framed boxes. true only for ONE unified illustration.
- absurd_unusual: false if the scene is a normal routine (e.g. office meeting, everyday activity). true only for clearly absurd wrong-place shock.
- If single_snapshot is false OR absurd_unusual is false, still fill other fields honestly from what you see.
- The sample_answer must explain why this could not happen in normal everyday life.
- Ground every detail in what you SEE in the image.
- Do not mention readable text on signs or labels.
- Do not invent people, actions, or objects that are not visible.`,
            },
          ],
        },
      ],
    });

    const block = resp.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Task8VisionAlignResult & {
      single_snapshot?: boolean;
      absurd_unusual?: boolean;
    };

    if (
      !parsed.situation ||
      !parsed.sample_answer ||
      typeof parsed.visual_description !== "string"
    ) {
      return null;
    }

    const single_snapshot = parsed.single_snapshot !== false;
    const absurd_unusual = parsed.absurd_unusual === true;

    if (!single_snapshot || !absurd_unusual) {
      console.log(
        `[speaking] Task 8 align rejected: panels=${!single_snapshot} notAbsurd=${!absurd_unusual}`,
      );
      return null;
    }

    return {
      situation: String(parsed.situation).trim(),
      scene_summary: String(parsed.scene_summary || "").trim(),
      visual_description: String(parsed.visual_description).trim(),
      sample_answer: String(parsed.sample_answer).trim(),
      sample_answer_band: Number(parsed.sample_answer_band) || 9,
      single_snapshot: true,
      absurd_unusual: true,
    };
  } catch (e) {
    console.error("alignTask8ContentToImage error:", e);
    return null;
  }
}

export type Task5OptionAlignResult = {
  short_label: string;
  facts: string[];
  visual_description: string;
  matches_expected: boolean;
  single_snapshot: boolean;
  notes?: string;
};

/** Read one Task 5 option image and return labels/facts grounded in pixels. */
export async function alignTask5OptionToImage(
  imageBase64: string,
  side: "A" | "B",
  expected: { label: string; prompt: string; seedFacts: string[] },
): Promise<Task5OptionAlignResult | null> {
  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      temperature: 0.2,
      system: "Return raw JSON only. No markdown.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `CELPIP Speaking Task 5 option picture ${side}. Official style: ONE objective choice (apartment, vehicle, room, product, venue layout) — ONE single photograph, not a comic strip.

We intended to draw: ${expected.label}
Planned visual: ${expected.prompt}
Seed facts (reuse if still plausible): ${expected.seedFacts.join("; ")}

Look at the ACTUAL image and return JSON:
{
  "short_label": "3-8 words naming what Picture ${side} really shows (e.g. compact studio apartment, red hatchback, yoga studio)",
  "facts": ["2-5 short concrete facts test takers can use — price/size/features inferred from visible props only, or reuse seed facts if they still fit"],
  "visual_description": "one paragraph of 8-10 visible objects, layout, materials, lighting — no invented people",
  "matches_expected": true or false,
  "single_snapshot": true or false,
  "notes": "one short sentence"
}

Rules:
- single_snapshot: false ONLY if there are clear gutters/borders between 2+ separate framed panels (comic strip, storyboard, film strip, collage grid).
- single_snapshot: true for one unified scene — including wide rooms, showroom with one product, or a single outer cartoon border around the whole image.
- single_snapshot: true even if the scene has left and right areas (one room, one car) — that is NOT multiple panels unless separated by panel gutters.
- matches_expected: true only if the image clearly shows the same TYPE of option as planned. false if wrong scene type, crowd/party, or unrelated subject.
- Ground every detail in what you SEE. Do not mention readable text on signs.
- People optional; if present, mention at most 0-2 tiny background figures.`,
            },
          ],
        },
      ],
    });

    const block = resp.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Task5OptionAlignResult;

    if (!parsed.short_label || typeof parsed.visual_description !== "string") {
      return null;
    }

    const facts = Array.isArray(parsed.facts)
      ? parsed.facts.map((f) => String(f).trim()).filter(Boolean).slice(0, 5)
      : [];

    return {
      short_label: String(parsed.short_label).trim(),
      facts: facts.length ? facts : [...expected.seedFacts],
      visual_description: String(parsed.visual_description).trim(),
      matches_expected: parsed.matches_expected !== false,
      single_snapshot: parsed.single_snapshot !== false,
      notes: parsed.notes,
    };
  } catch (e) {
    console.error("alignTask5OptionToImage error:", e);
    return null;
  }
}

export type Task5SampleAnswerResult = {
  chosen_option: "A" | "B";
  response: string;
  band: number;
  analysis: {
    choice: string;
    description: string;
    persuasion: string;
    contrast: string;
    language_used: string;
  };
};

/** Band-9 sample answer grounded in both Task 5 option pictures (pixels, not the text plan). */
export async function alignTask5SampleAnswerFromImages(
  imageBase64A: string,
  imageBase64B: string,
  task: {
    person_to_persuade?: string;
    prompt?: string;
    option_a?: { label?: string; facts?: string[] };
    option_b?: { label?: string; facts?: string[] };
  },
): Promise<Task5SampleAnswerResult | null> {
  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      temperature: 0.25,
      system: "You are a CELPIP examiner. Return raw JSON only. No markdown.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Picture A (first image) and Picture B (second image) for CELPIP Speaking Task 5.`,
            },
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: imageBase64A },
            },
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: imageBase64B },
            },
            {
              type: "text",
              text: `Person to persuade: ${task.person_to_persuade || "your friend"}
Task instructions: ${task.prompt || "Choose A or B and persuade"}

Option A label: ${task.option_a?.label || "Picture A"}
Option A facts: ${(task.option_a?.facts || []).join("; ")}

Option B label: ${task.option_b?.label || "Picture B"}
Option B facts: ${(task.option_b?.facts || []).join("; ")}

Look at BOTH images. Choose A or B based on what you actually see. Write a band-9 spoken response (~130-160 words) that:
- Clearly chooses A or B
- Describes ONLY visible details in the chosen picture
- Uses at least 2 facts from the chosen option (reuse seed facts only if they fit what you see)
- Persuades the person with 2+ reasons
- Briefly contrasts the other option using visible details

Return ONLY raw JSON:
{
  "chosen_option": "A" or "B",
  "response": "...",
  "band": 9,
  "analysis": {
    "choice": "...",
    "description": "...",
    "persuasion": "...",
    "contrast": "...",
    "language_used": "..."
  }
}

Rules: ground every visual detail in the images. Do not mention readable text on signs.`,
            },
          ],
        },
      ],
    });

    const block = resp.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Task5SampleAnswerResult;

    if (!parsed.response || (parsed.chosen_option !== "A" && parsed.chosen_option !== "B")) {
      return null;
    }

    return {
      chosen_option: parsed.chosen_option,
      response: String(parsed.response).trim(),
      band: Number(parsed.band) || 9,
      analysis: parsed.analysis || {
        choice: "",
        description: "",
        persuasion: "",
        contrast: "",
        language_used: "",
      },
    };
  } catch (e) {
    console.error("alignTask5SampleAnswerFromImages error:", e);
    return null;
  }
}

/** Task 4 sample answer from the shared picture pixels (predictions tied to visible activities). */
export async function alignTask4SampleToImage(
  imageBase64: string,
  focalPoints: string[],
): Promise<{ sample_answer: string; sample_answer_band: number } | null> {
  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      temperature: 0.25,
      system: "You are a CELPIP examiner. Return raw JSON only. No markdown.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: imageBase64 },
            },
            {
              type: "text",
              text: `CELPIP Speaking Task 4 — predict what will happen next in this picture.

Official learner question: "${SPEAKING_TASK4_LEARNER_PROMPT}"

Planned activities (use only if you can see them in the image):
${focalPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Look at the ACTUAL image. Return JSON:
{
  "sample_answer": "natural spoken band 9 response, 130-160 words: 2-3 predictions about DIFFERENT visible activities using will/going to/might/probably",
  "sample_answer_band": 9
}

Rules:
- Every prediction must tie to something visible in the image.
- Do not invent activities not shown.
- Do not mention readable text on signs.`,
            },
          ],
        },
      ],
    });

    const block = resp.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      sample_answer?: string;
      sample_answer_band?: number;
    };

    if (!parsed.sample_answer) return null;

    return {
      sample_answer: String(parsed.sample_answer).trim(),
      sample_answer_band: Number(parsed.sample_answer_band) || 9,
    };
  } catch (e) {
    console.error("alignTask4SampleToImage error:", e);
    return null;
  }
}
