import type { Task34SceneProfile } from "./speaking-image-style";
import {
  SINGLE_SNAPSHOT_PROMPT_LEAD,
  SINGLE_SNAPSHOT_RETRY_LEAD,
  TASK34_CLEAR_ILLUSTRATION_STYLE,
} from "./speaking-single-snapshot";
import {
  formatActivityList,
  formatSpacedActivities,
  TASK34_ACTION_RULE,
  TASK34_CLARITY_RULE,
  TASK34_DIVERSITY_RULE,
} from "./speaking-task34-diversity";

export type Task34PromptMode = "standard" | "snapshot_retry" | "diversity_retry";

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

/** Short action line — avoid prop lists the model turns into clutter. */
function compactAction(text: string, max = 72): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function sceneActions(scene: Task34SceneProfile): string[] {
  return scene.focalPoints.map(stripPosition).map((a) => compactAction(a)).slice(0, 5);
}

function minimalBackground(scene: Task34SceneProfile): string {
  if (!scene.backgroundHint) return "plain simple background";
  const first = scene.backgroundHint.split(",")[0]?.trim();
  return compactAction(first || scene.backgroundHint, 48);
}

function buildPrompt(
  scene: Task34SceneProfile,
  activityBlock: string,
  lead: string,
  style: string,
): string {
  const count = Math.min(5, scene.focalPoints.length);
  return [
    lead,
    style,
    `Scene: ${scene.setting}.`,
    `Show exactly ${count} separate unrelated activities — each easy to describe and predict what happens next:`,
    activityBlock,
    `Setting backdrop: ${minimalBackground(scene)}.`,
    TASK34_CLARITY_RULE,
    TASK34_DIVERSITY_RULE,
    TASK34_ACTION_RULE,
    "No readable text.",
  ].join(" ");
}

/**
 * CELPIP Task 3/4 — square snapshot, 4–5 clear purposeful activities, uncluttered cartoon.
 */
export function buildTask34ImagePrompt(
  scene: Task34SceneProfile,
  mode: Task34PromptMode = "standard",
): string {
  const actions = sceneActions(scene);

  if (mode === "diversity_retry" || mode === "snapshot_retry") {
    const block =
      mode === "diversity_retry"
        ? formatSpacedActivities(actions, SPATIAL_SLOTS)
        : formatActivityList(actions);
    return buildPrompt(scene, block, SINGLE_SNAPSHOT_RETRY_LEAD, TASK34_CLEAR_ILLUSTRATION_STYLE);
  }

  return buildPrompt(
    scene,
    formatActivityList(actions),
    SINGLE_SNAPSHOT_PROMPT_LEAD,
    TASK34_CLEAR_ILLUSTRATION_STYLE,
  );
}
