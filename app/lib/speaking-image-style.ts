/** CELPIP-style speaking pictures: busy cartoon illustrations (not photorealistic). */

import {
  SPEAKING_TASK3_AUTHORING_GUIDANCE,
  SPEAKING_TASK3_LEARNER_PROMPT,
  SPEAKING_TASK4_LEARNER_PROMPT,
  SPEAKING_TASK5_LEARNER_PROMPT,
  SPEAKING_TASK8_LEARNER_PROMPT,
  SPEAKING_TASK34_REQUIREMENT_PROMPT,
} from "./speaking-task34-requirement";
import { buildTask34ImagePrompt } from "./speaking-task34-image-prompt";
import {
  CELPIP_COMIC_ILLUSTRATION_STYLE,
  SINGLE_SNAPSHOT_PROMPT_LEAD,
  SINGLE_SNAPSHOT_RETRY_LEAD,
} from "./speaking-single-snapshot";

export const SPEAKING_IMAGE_NEGATIVE_EXTRA =
  "photorealistic, photograph, DSLR, hyperrealistic, 3d render, cinematic lighting, film grain, bokeh, oil painting, watercolor, dark moody, horror, minimalist, icon, clip art, single object, empty";

export const SPEAKING_IMAGE_NEGATIVE_SPARSE =
  "empty room, empty street, plain white background, minimal scene, single person only, one person, sparse composition, few objects, boring backdrop, vast empty space, isolated subject";

export const SPEAKING_IMAGE_NEGATIVE_PETS =
  "dog, puppy, dog breed, golden retriever, cat, kitten, pet, animal portrait, animals as main subject";

/** Put density FIRST — image models weight early tokens heavily. */
export const CELPIP_IMAGE_DENSITY_PREFIX =
  "CELPIP English test practice picture, simple editorial cartoon, square framing, exactly 5 clear activity groups, soft flat colors, uncluttered composition, open space, not photorealistic, no readable text";

export const SPEAKING_IMAGE_STYLE_TAIL =
  "Canadian everyday setting, square framing, no readable text no words no letters on signs";

export const SPEAKING_IMAGE_PROMPT_GUIDANCE = `For image_prompt, write 120–220 words of PURE visual description (like official CELPIP exam pictures). Structure it in three layers:
FOREGROUND: name 5 people with clothing colors and exact actions plus props they hold.
MIDDLE GROUND: name 2–3 different people or groups doing unrelated activities.
BACKGROUND: architecture, vehicles, windows, trees, weather, extra staff or bystanders.
Include at least 12 people and 15+ objects total. Never write "simple scene" or one-sentence prompts.
Do not include test instructions — only what the illustrator should draw.`;

/** Task 3/4: one square snapshot, 5 purposeful activities, simple and uncluttered. */
export const SPEAKING_TASK34_IMAGE_GUIDANCE = `CELPIP Speaking Task 3 and 4 — picture rules:
${SPEAKING_TASK34_REQUIREMENT_PROMPT}
Exactly 5 activities — each easy to describe and predict. No crowd, no trivia clutter.
Task 3: name the place, then each affair. Task 4: predict next for 2–3 affairs in this same scene.`;

export const SPEAKING_IMAGE_PROMPT_EXAMPLE =
  "FOREGROUND: woman in red jacket paying at reception desk with clipboard, boy in blue hoodie tying swim goggles, teenager holding striped towel. MIDDLE GROUND: seniors reading bulletin board, coach with whistle near lane ropes, staff stacking orange cones, family with stroller and water bottles. BACKGROUND: glass entrance doors, parking lot bicycles, jacket hooks, vending machine, pool deck visible through window.";

export const SPEAKING_IMAGE_PROMPT_EXAMPLE_B =
  "FOREGROUND: student in grey hoodie on laptop with headphones, librarian stamping stack of books. MIDDLE GROUND: newcomer family at info desk with pamphlets, toddler on floor with picture book, volunteer pushing grey cart of returns. BACKGROUND: long study tables, tall bookshelves, wall clock, winter coats on chairs, city bus through tall windows.";

/** Task 5: two comparable options (place, product, layout) — people optional. */
export const SPEAKING_TASK5_IMAGE_GUIDANCE = `CELPIP Speaking Task 5 shows TWO pictures of objective options to compare (apartments, vehicles, furniture, venues, equipment, room layouts). The test taker chooses ONE and persuades someone using facts (price, size, location, features).

Picture rules:
- Focus on the PLACE, PRODUCT, or SETTING being chosen — not a social scene or crowd.
- People are OPTIONAL; if shown, at most 0–2 small background figures, never the main subject.
- Describe layout, objects, materials, lighting, and spatial details (8–10 concrete visual facts).
- Use foreground / middle ground / background for rooms and outdoor venues.
- Each option must be a clearly different type of choice (not the same room with tiny changes).
- No readable text on signs, screens, or price tags.`;

export const SPEAKING_IMAGE_PROMPT_EXAMPLE_TASK5_A =
  "wide view of a compact studio apartment: kitchenette with bar stools, sofa bed, floor-to-ceiling city window, small dining nook, bike by door, minimalist furniture, bright daylight, no people";

export const SPEAKING_IMAGE_PROMPT_EXAMPLE_TASK5_B =
  "showroom floor with a small red hatchback on a platform: open hatch, polished tile, other cars blurred, dealership lighting, fuel-economy sticker shape without readable text, no people";

export type Task34PredictionHook = {
  id: string;
  subject: string;
  visible_now: string;
  prediction_prompt: string;
};

export type Task34SceneProfile = {
  setting: string;
  /** Exactly 5 unrelated activities in one location (Task 3 describe each). */
  focalPoints: string[];
  /** One prediction hook per activity (Task 4 uses 2–3 of these). */
  predictionHooks: Task34PredictionHook[];
  /** Planner category per slot — prefixed in Stability prompts. */
  slotCategories?: string[];
  /** Short lines for Stability AI — full focalPoints are too long and lose verbs when truncated. */
  stabilityLines?: string[];
  /** Shared location backdrop — architecture, weather, scattered props. */
  backgroundHint: string;
  /** Optional explicit prompt layers (override auto-split of focalPoints). */
  foreground?: string[];
  middleGround?: string[];
  background?: string[];
};

export type Task8SceneProfile = {
  title: string;
  /** One-line bizarre action (wrong place or wrong context). */
  scene: string;
  /** Why this violates normal expectations — used in Task 8 speaking prompts. */
  whyUnusual: string;
  /** Compact visual for image generation: one odd action + surprised bystanders. */
  visualFocus: string;
};

import { SPEAKING_TASK5_SCENE_PAIRS } from "./speaking-task5-scenes";
import { getTask34TemplateScene, SPEAKING_TASK34_SCENE_PROFILES } from "./speaking-task34-scenes";
import { SPEAKING_TASK8_SCENE_PROFILES } from "./speaking-task8-scenes";

export {
  SPEAKING_TASK5_SCENE_PAIRS,
  SPEAKING_TASK34_SCENE_PROFILES,
  SPEAKING_TASK8_SCENE_PROFILES,
  getTask34TemplateScene,
};

/** Text plan stored on tasks and sent to vision / Task 4. */
export function buildTask34VisualPlan(scene: Task34SceneProfile): string {
  const points = scene.focalPoints
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n");
  return `One square snapshot of ${scene.setting} — ${scene.focalPoints.length} purposeful activities, simple uncluttered scene.\n\n${points}`;
}

export function buildTask34PredictionBrief(scene: Task34SceneProfile): string {
  return scene.predictionHooks
    .map(
      (h) =>
        `${h.id}. ${h.subject} — now: ${h.visible_now}. Predict: ${h.prediction_prompt}`,
    )
    .join("\n");
}

/** Soft, clear lighting for Task 3/4. */
export const TASK34_CLEAR_LIGHTING = [
  "soft even daylight",
  "calm indoor lighting with plain walls",
  "gentle afternoon light, simple shadows",
  "bright but not harsh, muted friendly palette",
] as const;

/** @deprecated Use TASK34_CLEAR_LIGHTING */
export const TASK34_VIVID_LIGHTING = TASK34_CLEAR_LIGHTING;

/** @deprecated Prefer TASK34_CLEAR_LIGHTING for Task 3/4 image generation. */
export const TASK34_SCENE_VARIATIONS = [
  ...TASK34_CLEAR_LIGHTING,
  "soft afternoon light with gentle shadows",
];

export function pickTask34ClearLighting(): string {
  return TASK34_CLEAR_LIGHTING[
    Math.floor(Math.random() * TASK34_CLEAR_LIGHTING.length)
  ];
}

/** @deprecated Use pickTask34ClearLighting */
export function pickTask34VividVariation(): string {
  return pickTask34ClearLighting();
}

export type Task5ScenePair = {
  theme: string;
  situation: string;
  suggestedPerson: string;
  labelA: string;
  labelB: string;
  promptA: string;
  promptB: string;
  factsA: string[];
  factsB: string[];
};

export function pickTask34Scene() {
  return SPEAKING_TASK34_SCENE_PROFILES[
    Math.floor(Math.random() * SPEAKING_TASK34_SCENE_PROFILES.length)
  ];
}

/** Curated templates only — pool and supermarket (Stability fails on library/museum/rink). */
export function pickOutdoorTask34Scene() {
  return Math.random() < 0.55
    ? getTask34TemplateScene("pool")
    : getTask34TemplateScene("supermarket");
}

export function pickTask34Variation() {
  return TASK34_SCENE_VARIATIONS[
    Math.floor(Math.random() * TASK34_SCENE_VARIATIONS.length)
  ];
}

/** Random seed for Stability — different each generation even with the same scene profile. */
export function randomStabilitySeed() {
  return Math.floor(Math.random() * 4294967294) + 1;
}

export function buildTask3LockedContent(scene: Task34SceneProfile) {
  const visualPlan = buildTask34VisualPlan(scene);
  return {
    task_number: 3,
    task_type: "Describe a Picture",
    situation: scene.setting,
    preparation_time_seconds: 30,
    speaking_time_seconds: 60,
    tips: [
      "Start with the place, then describe what each person or group is doing",
      "Use action verbs: helping, handing, pointing, carrying, fixing, playing",
      "Use position words: on the left, in the middle, on the right",
    ],
    prompt: SPEAKING_TASK3_LEARNER_PROMPT,
    authoring_guidance: SPEAKING_TASK3_AUTHORING_GUIDANCE,
    describe_focus: scene.focalPoints,
    prediction_hooks: scene.predictionHooks,
    visual_description: visualPlan,
    image_prompt: visualPlan,
  };
}

export function buildTask4LockedContent() {
  return {
    task_number: 4,
    task_type: "Make Predictions",
    preparation_time_seconds: 30,
    speaking_time_seconds: 60,
    prompt: SPEAKING_TASK4_LEARNER_PROMPT,
    tips: [
      "Make 2–3 predictions about different people or things in the picture",
      "Use will, going to, might, and probably to show different levels of certainty",
      "Base each prediction on something you can see in the picture",
    ],
  };
}

/** @deprecated Use buildTask34ImagePrompt — kept for imports */
export function buildTask34StabilityPrompt(scene: Task34SceneProfile): string {
  return buildTask34ImagePrompt(scene, "standard");
}

export type Task34GenerationScript = {
  /** One-line requirement echoed for admin review */
  requirement?: string;
  scene_setting: string;
  focal_points: string[];
  prediction_hooks: Task34PredictionHook[];
  visual_plan: string;
  stability_prompt: string;
  scene_variation?: string;
  stability_seed?: number;
  vision_description?: string;
  task4_llm_prompt?: string;
  /** Structured LLM scene plan (Task 3/4 hybrid pipeline) */
  llm_scene_plan?: Record<string, unknown>;
  scene_planned_by?: "llm" | "fallback" | "curated";
};

export function pickTask8Scene() {
  return SPEAKING_TASK8_SCENE_PROFILES[
    Math.floor(Math.random() * SPEAKING_TASK8_SCENE_PROFILES.length)
  ];
}

/** Learner-facing task fields — situation and picture text come only from the scene profile. */
export function buildTask8LockedContent(scene: Task8SceneProfile) {
  return {
    task_number: 8,
    task_type: "Describe an unusual situation",
    situation: scene.title,
    scene_summary: scene.scene,
    why_unusual: scene.whyUnusual,
    visual_description: scene.visualFocus,
    image_prompt: scene.visualFocus,
    prompt: SPEAKING_TASK8_LEARNER_PROMPT,
    preparation_time_seconds: 30,
    speaking_time_seconds: 60,
    tips: [
      "Say what looks absurd and unimaginable first — why it cannot happen in normal life",
      "Describe the main person or object and how others are reacting with surprise",
      "Explain what you think happened just before this moment",
    ],
  };
}

const TASK8_STABILITY_STYLE =
  `${CELPIP_COMIC_ILLUSTRATION_STYLE}, square framing, 3-6 shocked cartoon bystanders, human-centered, no violence, not a busy crowd`;

/**
 * Task 8 — absurd content FIRST (Stability weights early tokens), then one-scene rule, then style.
 */
export function buildTask8StabilityPrompt(
  scene: Task8SceneProfile,
  mode: "standard" | "snapshot_retry" = "standard",
): string {
  const absurdCore = [
    `UNIMAGINABLE ABSURD SCENE: ${scene.scene}`,
    scene.visualFocus,
    `Why absurd: ${scene.whyUnusual}`,
  ].join(". ");

  if (mode === "snapshot_retry") {
    return [
      absurdCore,
      SINGLE_SNAPSHOT_RETRY_LEAD,
      TASK8_STABILITY_STYLE,
    ].join(". ");
  }

  return [
    absurdCore,
    SINGLE_SNAPSHOT_PROMPT_LEAD,
    TASK8_STABILITY_STYLE,
  ].join(". ");
}

const TASK5_STABILITY_STYLE =
  `${SINGLE_SNAPSHOT_PROMPT_LEAD}, ${CELPIP_COMIC_ILLUSTRATION_STYLE}, CELPIP speaking task 5 ONE option only, square framing, single continuous editorial cartoon illustration filling the frame, one room or one product or one vehicle, not a comparison layout not side-by-side options, props and architecture visible, at most zero to two tiny background people, not a party not a crowd`;

export const TASK34_STABILITY_STYLE =
  `${SINGLE_SNAPSHOT_PROMPT_LEAD}, ${CELPIP_COMIC_ILLUSTRATION_STYLE}, CELPIP speaking task 3 describe a picture, simple cartoon with exactly 5 unrelated purposeful activities, uncluttered, square framing, open space between groups`;

export function pickTask5ScenePair() {
  return SPEAKING_TASK5_SCENE_PAIRS[
    Math.floor(Math.random() * SPEAKING_TASK5_SCENE_PAIRS.length)
  ];
}

export function buildTask5StabilityPrompt(
  pair: Task5ScenePair,
  side: "A" | "B",
  mode: "standard" | "snapshot_retry" = "standard",
): string {
  const label = side === "A" ? pair.labelA : pair.labelB;
  const visual = side === "A" ? pair.promptA : pair.promptB;
  const optionCore = `ONE CELPIP editorial cartoon illustration of ${label}: ${visual}`;
  if (mode === "snapshot_retry") {
    return [
      optionCore,
      SINGLE_SNAPSHOT_RETRY_LEAD,
      TASK5_STABILITY_STYLE,
    ].join(". ");
  }
  return [optionCore, SINGLE_SNAPSHOT_PROMPT_LEAD, TASK5_STABILITY_STYLE].join(". ");
}

export function buildTask5LockedContent(pair: Task5ScenePair) {
  return {
    task_number: 5,
    task_type: "Choose One Picture + Persuade",
    theme: pair.theme,
    situation: pair.situation,
    prompt: SPEAKING_TASK5_LEARNER_PROMPT,
    person_to_persuade: pair.suggestedPerson,
    option_a: {
      label: `Picture A — ${pair.labelA}`,
      image_prompt: pair.promptA,
      facts: [...pair.factsA],
    },
    option_b: {
      label: `Picture B — ${pair.labelB}`,
      image_prompt: pair.promptB,
      facts: [...pair.factsB],
    },
    preparation_time_seconds: 60,
    speaking_time_seconds: 60,
    tips: [
      "Choose A or B quickly, then describe objects, layout, and setting in your chosen picture",
      "Use comparative language: cheaper, larger, closer, more convenient",
      "Give at least 2 concrete facts (price, distance, size, features) to persuade",
      "People are not required — focus on what you see in the place or product",
      "Briefly say why the other option is less suitable, then conclude",
    ],
  };
}

/** Final prompt sent to Stability AI — density prefix always preserved. */
export function buildStabilityImagePrompt(
  taskNumber: number | undefined,
  sceneDescription: string,
  extraFromLlm?: string,
): string {
  const body = [sceneDescription.trim(), extraFromLlm?.trim()].filter(Boolean).join(", ");

  if (taskNumber === 8) {
    return [
      TASK8_STABILITY_STYLE,
      body,
      SPEAKING_IMAGE_STYLE_TAIL,
    ].join(", ");
  }

  if (taskNumber === 5) {
    return [TASK5_STABILITY_STYLE, body, SPEAKING_IMAGE_STYLE_TAIL].join(", ");
  }

  if (taskNumber === 3 || taskNumber === 4) {
    return [TASK34_STABILITY_STYLE, body, SPEAKING_IMAGE_STYLE_TAIL].join(", ");
  }

  return [CELPIP_IMAGE_DENSITY_PREFIX, body, SPEAKING_IMAGE_STYLE_TAIL].join(", ");
}

export function enrichSpeakingImagePromptForTask(
  taskNumber: number | undefined,
  prompt: string,
): string {
  if (taskNumber === 3 || taskNumber === 4 || taskNumber === 5 || taskNumber === 8) {
    return buildStabilityImagePrompt(taskNumber, prompt);
  }
  return buildStabilityImagePrompt(undefined, prompt);
}

/** @deprecated Use buildStabilityImagePrompt */
export function enrichSpeakingImagePromptDense(prompt: string): string {
  return buildStabilityImagePrompt(3, prompt);
}

export function enrichSpeakingImagePromptForTask8(prompt: string): string {
  return buildStabilityImagePrompt(8, prompt);
}

export function enrichSpeakingImagePrompt(prompt: string): string {
  return buildStabilityImagePrompt(3, prompt);
}
