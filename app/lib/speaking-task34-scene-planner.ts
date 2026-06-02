import Anthropic from "@anthropic-ai/sdk";
import { parseLlmJsonWithRepair } from "./reading-llm-json";
import {
  getTask34TemplateScene,
  pickTask34Scene,
  type Task34PredictionHook,
  type Task34SceneProfile,
} from "./speaking-image-style";
import { TASK34_ACTION_CATEGORY_EXAMPLES } from "./speaking-task34-diversity";

const client = new Anthropic();

/** Allowed action categories — each slot must use a different one. No desk/study. */
export const TASK34_PLANNER_CATEGORIES = [
  "sport_physical",
  "eating_drinking",
  "paying_serving",
  "cleaning_maintenance",
  "carrying_moving",
  "teaching_demo",
  "playing_games",
  "helping_child",
  "shopping_trying",
  "music_performance",
] as const;

export type Task34PlannerCategory = (typeof TASK34_PLANNER_CATEGORIES)[number];

export type Task34ScenePlanSlot = {
  zone: string;
  category: Task34PlannerCategory;
  visual_line: string;
  subject: string;
  visible_now: string;
  prediction: string;
};

export type Task34ScenePlan = {
  setting: string;
  background_hint: string;
  scene_type: string;
  slots: Task34ScenePlanSlot[];
};

export type Task34ScenePlanFailure = {
  setting: string;
  issue: string;
  visionNotes?: string;
  count: number;
  activitiesDiverse: boolean;
  /** Image model drew desk/study scenes despite the plan. */
  diversityFailed?: boolean;
  /** Settings already tried this generation — planner must pick a different place. */
  avoidSettings?: string[];
};

export type PlanTask34SceneResult = {
  scene: Task34SceneProfile;
  plan: Task34ScenePlan;
  plannedBy: "llm" | "fallback" | "curated";
};

const ZONE_ALIASES: Record<string, string> = {
  left: "LEFT",
  "centre-left": "CENTRE-LEFT",
  "center-left": "CENTRE-LEFT",
  centre: "CENTRE",
  center: "CENTRE",
  "centre-right": "CENTRE-RIGHT",
  "center-right": "CENTRE-RIGHT",
  right: "RIGHT",
};

/** Settings where Stability often collapses to seated desk/study groups. */
const INDOOR_RISKY_SETTINGS =
  /library|lobby|clinic|waiting room|museum|classroom|office|study|seminar|meeting/i;

const SCENE_TYPE_HINTS = [
  "outdoor community festival in a town square",
  "waterfront park path beside a lake",
  "busy downtown sidewalk outside shops",
  "transit bus shelter on a rainy evening",
  "indoor skating rink spectator area beside the ice",
  "airport departure gate during holiday travel",
  "apartment building lobby on a moving day",
  "outdoor community swimming pool on a sunny summer day",
  "supermarket checkout area on a Saturday morning",
  "school gymnasium during a community information fair",
];

const OUTDOOR_SCENE_HINTS = [
  "outdoor festival — food stall, game booth, musician, face painting",
  "waterfront park — jogging, cycling, pushing stroller, flying kite",
  "busy sidewalk — street musician, food cart, courier with package",
  "outdoor swimming pool — lifeguard, jumping, mopping, eating",
  "supermarket checkout — scanning, bagging, paying, carrying bags",
];

const DESK_BANNED_WORDS =
  /\b(read|reads|reading|write|writes|writing|type|typing|desk|desks|notebook|notebooks|paper|papers|study|studying|laptop|homework|meeting|seminar|discussion circle|classroom|office worker|coworking)\b/i;

const MOVEMENT_VERBS =
  /\b(jump|jumping|swim|swimming|mop|mopping|pay|paying|carry|carrying|eat|eating|sweep|sweeping|throw|throwing|push|pushing|lift|lifting|skate|skating|run|running|walk|walking|scan|scanning|bag|bagging|serve|serving|clean|cleaning|fix|fixing|paint|painting|kick|kicking|climb|climbing|dive|diving|splash|whistle|blow|blowing)\b/i;

function normalizeZone(raw: string, index: number): string {
  const key = raw.trim().toLowerCase();
  if (ZONE_ALIASES[key]) return ZONE_ALIASES[key];
  const defaults = ["LEFT", "CENTRE-LEFT", "CENTRE", "CENTRE-RIGHT", "RIGHT"];
  return defaults[index % defaults.length];
}

function normalizeCategory(raw: string): Task34PlannerCategory | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return TASK34_PLANNER_CATEGORIES.includes(key as Task34PlannerCategory)
    ? (key as Task34PlannerCategory)
    : null;
}

function compactLine(text: string, max = 72): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function hookId(index: number): string {
  return String.fromCharCode(65 + index);
}

function planToProfile(plan: Task34ScenePlan): Task34SceneProfile {
  const focalPoints = plan.slots.map((slot, i) => {
    const zone = normalizeZone(slot.zone, i);
    const cat = slot.category.replace(/_/g, " ");
    return `${zone}: ${compactLine(`${cat} — ${slot.visual_line}`, 64)}`;
  });

  const predictionHooks: Task34PredictionHook[] = plan.slots.map((slot, i) => ({
    id: hookId(i),
    subject: compactLine(slot.subject, 48),
    visible_now: compactLine(slot.visible_now, 56),
    prediction_prompt: compactLine(slot.prediction, 72),
  }));

  return {
    setting: compactLine(plan.setting, 120),
    focalPoints,
    predictionHooks,
    slotCategories: plan.slots.map((s) => s.category),
    stabilityLines: plan.slots.map((s) => compactLine(s.visual_line)),
    backgroundHint: compactLine(plan.background_hint, 64),
  };
}

function validatePlan(
  raw: Task34ScenePlan,
  options?: { outdoorOnly?: boolean },
): { plan: Task34ScenePlan | null; rejectReason?: string } {
  if (!raw.setting?.trim() || !Array.isArray(raw.slots)) {
    return { plan: null, rejectReason: "missing setting or slots array" };
  }
  if (options?.outdoorOnly && INDOOR_RISKY_SETTINGS.test(raw.setting)) {
    return { plan: null, rejectReason: `indoor setting not allowed on diversity retry: ${raw.setting.slice(0, 40)}` };
  }

  const slots = raw.slots
    .map((slot, i) => {
      const category = normalizeCategory(String(slot.category ?? ""));
      if (!category || !slot.visual_line?.trim()) return null;
      const visual_line = compactLine(String(slot.visual_line));
      if (DESK_BANNED_WORDS.test(visual_line)) return null;
      return {
        zone: normalizeZone(String(slot.zone ?? ""), i),
        category,
        visual_line,
        subject: compactLine(String(slot.subject || "people in the scene"), 48),
        visible_now: compactLine(String(slot.visible_now || slot.visual_line), 56),
        prediction: compactLine(
          String(slot.prediction || "what happens next"),
          72,
        ),
      } satisfies Task34ScenePlanSlot;
    })
    .filter(Boolean) as Task34ScenePlanSlot[];

  if (slots.length !== 5) {
    return {
      plan: null,
      rejectReason: `need exactly 5 slots, got ${slots.length} valid slots`,
    };
  }

  const categories = new Set(slots.map((s) => s.category));
  if (categories.size !== slots.length) {
    return { plan: null, rejectReason: "duplicate action categories in slots" };
  }

  const movementCount = slots.filter((s) => MOVEMENT_VERBS.test(s.visual_line)).length;
  if (movementCount < 1) {
    return {
      plan: null,
      rejectReason: `only ${movementCount}/${slots.length} slots contain movement verbs (need 1+)`,
    };
  }

  return {
    plan: {
      setting: raw.setting.trim(),
      background_hint: compactLine(
        raw.background_hint || "bright shelves and walls with soft daylight",
        64,
      ),
      scene_type: compactLine(raw.scene_type || "community space", 48),
      slots,
    },
  };
}

function buildPlannerUserPrompt(failure?: Task34ScenePlanFailure): string {
  const diversityBlock =
    failure?.diversityFailed
      ? `
CRITICAL: The image model keeps drawing everyone SEATED at desks reading/writing in a circle.
Your previous plan was ignored. Replan with ONLY outdoor or open public venues (pool, checkout line, festival, park, rink).
Every visual_line MUST use a STANDING or MOVING verb (jumping, paying, mopping, carrying, eating, skating, scanning).
ZERO reading, writing, typing, notebooks, papers, meetings, or seated groups.
`
      : "";

  const avoidBlock =
    failure?.avoidSettings?.length ?
      `
Already used or failed this generation — pick a DIFFERENT place (do NOT reuse): ${failure.avoidSettings.join(" | ")}.
Prefer: festival, park, bus shelter, airport gate, skating rink, downtown sidewalk, gym fair, moving-day lobby.
Only use swimming pool or supermarket checkout if desk/study collapse is explicit below.
`
    : `
Pick a varied Canadian everyday place. Do NOT default to swimming pool — rotate across festival, park, transit, shops, rink, airport, pool, or checkout.
`;

  const failureBlock = failure
    ? `
Previous plan FAILED (${failure.issue}).
Previous setting: ${failure.setting}
Vision saw ${failure.count} groups; diverse=${failure.activitiesDiverse ? "yes" : "no"}.
${failure.visionNotes ? `Vision notes: ${failure.visionNotes}` : ""}
`
    : "";

  const sceneHints =
    failure?.diversityFailed ? OUTDOOR_SCENE_HINTS : SCENE_TYPE_HINTS;

  return `Plan ONE CELPIP Speaking Task 3/4 cartoon scene for a square illustration.

${diversityBlock}${avoidBlock}${failureBlock}
Hard rules:
- Canadian everyday location — one continuous place only.
- Exactly 5 activity slots (required).
- Each slot: a different category from: ${TASK34_PLANNER_CATEGORIES.join(", ")}
- ${TASK34_ACTION_CATEGORY_EXAMPLES}
- BANNED in visual_line: read, write, type, desk, notebook, paper, study, meeting, laptop, seated discussion.
- visual_line: max 10 words — MOVING or STANDING people + verb + one prop.
- background_hint: bright, recognizable environment details; never "empty" or "plain grey" only.
- Pick actions an image model can draw as separate groups: jump, pay, mop, carry, eat, scan card, skate, whistle, bag groceries.
- Do NOT use library reading room, office meeting, clinic waiting room, or classroom seminar.

Scene ideas (pick one, vary from recent): ${sceneHints.join("; ")}

Return ONLY raw JSON:
{
  "setting": "one sentence naming the place",
  "background_hint": "bright simple backdrop with visible context (e.g. grocery shelves, park trees, rink boards) — not empty grey void",
  "scene_type": "short label e.g. town festival",
  "slots": [
    {
      "zone": "left",
      "category": "playing_games",
      "visual_line": "teenager serving food from grill",
      "subject": "the teenager at the grill",
      "visible_now": "flipping burgers",
      "prediction": "whether a line will form at the stall"
    }
  ]
}`;
}

function curatedSceneToPlan(scene: Task34SceneProfile): Task34ScenePlan {
  const actions =
    scene.stabilityLines ??
    scene.focalPoints.map((fp) =>
      fp.replace(/^(LEFT|RIGHT|CENTRE(?:-LEFT|-RIGHT)?):\s*/i, "").trim(),
    );

  return {
    setting: scene.setting,
    background_hint: scene.backgroundHint,
    scene_type: scene.setting.split(" ").slice(0, 3).join(" "),
    slots: actions.slice(0, 5).map((visual, i) => {
      const hook = scene.predictionHooks[i];
      return {
        zone: SPATIAL_DEFAULTS[i] ?? "center",
        category: (scene.slotCategories?.[i] ??
          TASK34_PLANNER_CATEGORIES[i % TASK34_PLANNER_CATEGORIES.length]) as Task34PlannerCategory,
        visual_line: compactLine(
          typeof visual === "string" ? visual.replace(/^[\w\s]+ — /, "") : String(visual),
        ),
        subject: hook?.subject ?? "people in the scene",
        visible_now: hook?.visible_now ?? visual,
        prediction: hook?.prediction_prompt ?? "what happens next",
      };
    }),
  };
}

const SPATIAL_DEFAULTS = ["left", "center-left", "center", "center-right", "right"];

/** Random curated profile from the scene library (not only pool/supermarket). */
export function planTask34RandomProfileScene(): PlanTask34SceneResult {
  const profile = pickTask34Scene();
  const plan = curatedSceneToPlan(profile);
  const label = profile.setting.slice(0, 50);
  console.log(`[speaking] Task 3/4: profile scene "${label}" — ${plan.slots.length} activities`);
  return { scene: planToProfile(plan), plan, plannedBy: "curated" };
}

/** Hand-tuned pool or supermarket — last resort when desk/study keeps returning. */
export function planTask34TemplateScene(
  template: "pool" | "supermarket" = "pool",
): PlanTask34SceneResult {
  const scene = getTask34TemplateScene(template);
  const plan = curatedSceneToPlan(scene);
  console.log(
    `[speaking] Task 3/4: template scene "${template}" — ${plan.slots.length} short stability lines`,
  );
  return { scene: planToProfile(plan), plan, plannedBy: "curated" };
}

/** Last resort when the image model keeps drawing desk/study scenes. */
export function planTask34CuratedScene(): PlanTask34SceneResult {
  return planTask34TemplateScene(Math.random() < 0.5 ? "supermarket" : "pool");
}

/** LLM plans a structured scene; falls back to a random profile if parsing fails. */
export async function planTask34Scene(
  failure?: Task34ScenePlanFailure,
): Promise<PlanTask34SceneResult> {
  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      temperature: failure?.diversityFailed ? 0.85 : failure ? 0.92 : 0.88,
      system:
        "You plan varied CELPIP exam picture scenes. Never repeat a setting from the avoid list. Return raw JSON only. No markdown.",
      messages: [{ role: "user", content: buildPlannerUserPrompt(failure) }],
    });

    const block = resp.content[0];
    const text = block.type === "text" ? block.text : "";
    const parsed = await parseLlmJsonWithRepair<Task34ScenePlan>(client, text);
    const { plan, rejectReason } = validatePlan(parsed, {
      outdoorOnly: failure?.diversityFailed,
    });

    if (plan) {
      console.log(
        `[speaking] Task 3/4: LLM planned "${plan.scene_type}" — ${plan.slots.length} slots (${plan.setting.slice(0, 60)}…)`,
      );
      return {
        scene: planToProfile(plan),
        plan,
        plannedBy: "llm",
      };
    }

    console.warn(
      `[speaking] Task 3/4: LLM scene plan invalid (${rejectReason ?? "unknown"}) — using random profile scene`,
    );
  } catch (e) {
    console.error("[speaking] Task 3/4: LLM scene plan error:", e);
  }

  return planTask34RandomProfileScene();
}

export function failureFromVisionCheck(
  scene: Task34SceneProfile,
  check: {
    count: number;
    activitiesDiverse: boolean;
    actionableActivities: boolean;
    notes?: string;
  },
  issue: string,
  avoidSettings: string[] = [],
): Task34ScenePlanFailure {
  const deskCollapse =
    !check.activitiesDiverse &&
    (check.notes?.match(/desk|study|read|writ|seated|meeting|notebook|paper/i) != null ||
      issue.includes("action category"));

  const settings = [...avoidSettings];
  if (scene.setting && !settings.includes(scene.setting)) {
    settings.push(scene.setting);
  }

  return {
    setting: scene.setting,
    issue,
    visionNotes: check.notes,
    count: check.count,
    activitiesDiverse: check.activitiesDiverse,
    diversityFailed: deskCollapse,
    avoidSettings: settings,
  };
}
