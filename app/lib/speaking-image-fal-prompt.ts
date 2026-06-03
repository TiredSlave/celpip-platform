import type { Task34SceneProfile } from "./speaking-image-style";
import type { Task34ScenePlan } from "./speaking-task34-scene-planner";

const FAL_MAX_CHARS = 2400;

/** Fal Task 3/4 — avoid "soft/muted" wording that washes out backgrounds. */
export const FAL_TASK34_VISUAL_STYLE =
  "bright clear daylight, even warm lighting, cheerful saturated flat cartoon colors, clean outlines, visible environment, not grey washed out or dim";

/** Fal input checker flags words in negative prompts and harsh NOT-lists — keep prompts family-safe. */
const FAL_BLOCKED_IN_PROMPT =
  /\b(nsfw|violence|horror|gore|blood|weapon|nude|naked|sexy|erotic)\b/gi;

const FAL_REPLACEMENTS: [RegExp, string][] = [
  [/\bchildren\b/gi, "people"],
  [/\bchild\b/gi, "young person"],
  [/\btoddler\b/gi, "small person"],
  [/\bteenager\b/gi, "young adult"],
  [/\binfant\b/gi, "baby in arms"],
  [/\bNOT\b/g, "no"],
];

export function isFalContentPolicyError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("content_policy") ||
    lower.includes("content checker") ||
    lower.includes("content could not be processed")
  );
}

/** Short avoid list for Fal — no nsfw/violence/horror (input checker flags those even in Avoid). */
export function buildFalSafeAvoidClause(taskNumber?: number): string {
  const base = [
    "blurry",
    "readable text",
    "watermark",
    "comic strip",
    "panel grid",
    "multiple frames",
    "photorealistic",
  ];
  if (taskNumber === 3 || taskNumber === 4) {
    base.push(
      "classroom",
      "office desks",
      "empty room without people",
      "only one activity",
      "crowded chaos",
      "dim lighting",
      "grey void background",
      "washed out muted colors",
    );
  }
  return base.join(", ");
}

export function sanitizePromptForFal(text: string): string {
  let s = text.replace(FAL_BLOCKED_IN_PROMPT, "");
  for (const [pattern, replacement] of FAL_REPLACEMENTS) {
    s = s.replace(pattern, replacement);
  }
  return s.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").trim();
}

function stripPosition(fp: string): string {
  return fp.replace(/^(LEFT|RIGHT|CENTRE(?:-LEFT|-RIGHT)?):\s*/i, "").trim();
}

function sceneActivityLines(scene: Task34SceneProfile): string[] {
  if (scene.stabilityLines?.length) {
    return scene.stabilityLines.map((line) => line.trim()).slice(0, 5);
  }
  return scene.focalPoints.map(stripPosition).slice(0, 5);
}

function trimFalPrompt(prompt: string): string {
  return prompt.length > FAL_MAX_CHARS ?
      `${prompt.slice(0, FAL_MAX_CHARS - 1)}…`
    : prompt;
}

/**
 * Fal Task 3/4 — render the LLM plan directly (setting + slots + backdrop).
 */
export function buildTask34ImagePromptFromPlan(plan: Task34ScenePlan): string {
  const groups = plan.slots
    .map((slot, i) => {
      const zone = slot.zone?.trim() || ["left", "upper center", "center", "right", "lower center"][i];
      return `${zone}: ${sanitizePromptForFal(slot.visual_line)}`;
    })
    .join(". ");

  const backdrop = plan.background_hint?.trim() ?
    `Backdrop: ${sanitizePromptForFal(plan.background_hint)}.`
  : "";

  const prompt = [
    "Square editorial cartoon for a CELPIP English speaking test, one unified scene, one moment.",
    FAL_TASK34_VISUAL_STYLE + ".",
    sanitizePromptForFal(plan.setting) + ".",
    backdrop,
    `Five separate small groups in the same place, each doing one clear action: ${groups}.`,
    "Consistent location throughout, open space between groups, blank packaging with no letters.",
  ]
    .filter(Boolean)
    .join(" ");

  return trimFalPrompt(prompt);
}

/**
 * Short Task 3/4 prompt from profile (fallback when plan is unavailable).
 */
export function buildTask34ImagePromptForFal(scene: Task34SceneProfile): string {
  const zones = ["left", "upper center", "center", "right", "lower center"];
  const lines = sceneActivityLines(scene);
  const groups = lines
    .map((line, i) => `${zones[i % zones.length]}: ${sanitizePromptForFal(line)}`)
    .join(". ");

  const backdrop = scene.backgroundHint?.trim() ?
    `Backdrop: ${sanitizePromptForFal(scene.backgroundHint)}.`
  : "";

  const prompt = [
    "Square editorial cartoon for a CELPIP English speaking test, one unified scene.",
    FAL_TASK34_VISUAL_STYLE + ".",
    sanitizePromptForFal(scene.setting) + ".",
    backdrop,
    `Five separate groups, each doing a different action: ${groups}.`,
    "Consistent place, open space between groups, blank packaging, no readable text.",
  ]
    .filter(Boolean)
    .join(" ");

  return trimFalPrompt(prompt);
}

/** Ultra-minimal fallback when Fal still rejects the prompt. */
export function buildTask34ImagePromptForFalMinimal(
  scene: Task34SceneProfile,
  plan?: Task34ScenePlan,
): string {
  const verbs = (plan?.slots ?? []).length ?
    plan!.slots.map((s) => sanitizePromptForFal(s.visual_line.split(/\s+/).slice(0, 8).join(" ")))
  : sceneActivityLines(scene).map((line) =>
      sanitizePromptForFal(line.split(/\s+/).slice(0, 8).join(" ")),
    );
  const setting = sanitizePromptForFal(plan?.setting ?? scene.setting);
  return sanitizePromptForFal(
    `Bright square cartoon, ${setting}. Five groups: ${verbs.join("; ")}. Clear daylight, saturated colors, no text.`,
  ).slice(0, 800);
}
