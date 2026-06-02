import type { Task34SceneProfile } from "./speaking-image-style";
export {
  buildTask34ImagePromptForFal,
  buildTask34ImagePromptForFalMinimal,
  buildTask34ImagePromptFromPlan,
} from "./speaking-image-fal-prompt";
import {
  SINGLE_SNAPSHOT_PROMPT_LEAD,
  SINGLE_SNAPSHOT_RETRY_LEAD,
  TASK34_CLEAR_ILLUSTRATION_STYLE,
} from "./speaking-single-snapshot";
import {
  formatActivityList,
  TASK34_PEOPLE_RULE,
  TASK34_STABILITY_ANTI_DESK,
  TASK34_STABILITY_MOVEMENT_RULE,
} from "./speaking-task34-diversity";

export type Task34PromptMode =
  | "standard"
  | "snapshot_retry"
  | "diversity_retry"
  | "people_retry"
  | "physical_retry"
  | "template";

const SPATIAL_SLOTS = [
  "left",
  "upper middle",
  "center",
  "right",
  "lower middle",
] as const;

function stripPosition(fp: string): string {
  return fp.replace(/^(LEFT|RIGHT|CENTRE(?:-LEFT|-RIGHT)?):\s*/i, "").trim();
}

function compactAction(text: string, max = 64): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function sceneActions(scene: Task34SceneProfile): string[] {
  if (scene.stabilityLines?.length) {
    return scene.stabilityLines.map((a) => compactAction(a)).slice(0, 5);
  }
  return scene.focalPoints.map(stripPosition).map((a) => compactAction(a)).slice(0, 5);
}

function minimalBackground(scene: Task34SceneProfile): string {
  if (!scene.backgroundHint) return "simple backdrop";
  const first = scene.backgroundHint.split(",")[0]?.trim();
  return compactAction(first || scene.backgroundHint, 36);
}

function formatCategorySpacedActivities(
  actions: string[],
  categories: string[] | undefined,
): string {
  return actions
    .slice(0, 5)
    .map((action, i) => {
      const zone = SPATIAL_SLOTS[i % SPATIAL_SLOTS.length];
      const cat = categories?.[i]?.replace(/_/g, " ") ?? "action";
      return `${zone}: [${cat}] ${action}`;
    })
    .join("; ");
}

/** Shortest prompt — uses pre-written stabilityLines verbatim (pool / supermarket). */
function buildTemplatePrompt(scene: Task34SceneProfile): string {
  const actions = sceneActions(scene);
  const groups = actions
    .map((line, i) => `${SPATIAL_SLOTS[i % SPATIAL_SLOTS.length]} group: ${line}`)
    .join(". ");

  return [
    "Square CELPIP English test cartoon, ONE illustration, ONE scene, NOT comic strip.",
    TASK34_STABILITY_ANTI_DESK,
    "NOT classroom NOT school NOT students at desks NOT teacher NOT laptops NOT meeting.",
    compactAction(scene.setting, 90) + ".",
    `Draw exactly ${actions.length} separate spaced-apart groups: ${groups}.`,
    TASK34_STABILITY_MOVEMENT_RULE,
    "Simple flat cartoon colors, open space between groups, no readable text.",
  ].join(" ");
}

function buildChecklistPrompt(
  scene: Task34SceneProfile,
  activityBlock: string,
  lead: string,
): string {
  const count = Math.min(5, scene.focalPoints.length || sceneActions(scene).length);
  return [
    lead,
    TASK34_STABILITY_ANTI_DESK,
    `Draw exactly ${count} SEPARATE groups of PEOPLE in one square cartoon:`,
    activityBlock,
    TASK34_STABILITY_MOVEMENT_RULE,
    TASK34_PEOPLE_RULE,
    `Place: ${compactAction(scene.setting, 80)}.`,
    `Backdrop: ${minimalBackground(scene)}.`,
    TASK34_CLEAR_ILLUSTRATION_STYLE,
    "No readable text.",
  ].join(" ");
}

function buildPhysicalRetryPrompt(scene: Task34SceneProfile): string {
  if (scene.stabilityLines?.length) {
    return buildTemplatePrompt(scene);
  }
  const actions = sceneActions(scene);
  const block = formatCategorySpacedActivities(actions, scene.slotCategories);
  return [
    "ONE square CELPIP cartoon illustration, one scene, NOT comic strip.",
    TASK34_STABILITY_ANTI_DESK,
    `Location: ${compactAction(scene.setting, 72)}.`,
    `Show ${actions.length} UNRELATED standing or moving groups spaced apart: ${block}.`,
    "Simple flat cartoon colors, Canadian everyday setting, no text.",
  ].join(" ");
}

export function buildTask34ImagePrompt(
  scene: Task34SceneProfile,
  mode: Task34PromptMode = "standard",
): string {
  if (mode === "template" && scene.stabilityLines?.length) {
    return buildTemplatePrompt(scene);
  }

  const actions = sceneActions(scene);

  if (mode === "physical_retry") {
    return buildPhysicalRetryPrompt(scene);
  }

  if (mode === "people_retry") {
    const block = actions
      .map((a, i) => `${SPATIAL_SLOTS[i % SPATIAL_SLOTS.length]}: PEOPLE — ${a}`)
      .join("; ");
    return buildChecklistPrompt(
      scene,
      block,
      "MUST show 5 GROUPS OF PEOPLE — NOT empty furniture, NOT vacant room without people",
    );
  }

  if (mode === "diversity_retry") {
    const block = formatCategorySpacedActivities(actions, scene.slotCategories);
    return buildChecklistPrompt(
      scene,
      block,
      SINGLE_SNAPSHOT_RETRY_LEAD + " Each group a DIFFERENT standing or moving action.",
    );
  }

  if (mode === "snapshot_retry") {
    return buildChecklistPrompt(
      scene,
      formatActivityList(actions),
      SINGLE_SNAPSHOT_RETRY_LEAD,
    );
  }

  const block = formatCategorySpacedActivities(actions, scene.slotCategories);
  return buildChecklistPrompt(scene, block, SINGLE_SNAPSHOT_PROMPT_LEAD);
}
