import { generateSpeakingImage, speakingImageProvider } from "./speaking-image-generate";
import {
  buildTask34ImagePrompt,
  buildTask34ImagePromptForFalMinimal,
  buildTask34ImagePromptFromPlan,
  type Task34PromptMode,
} from "./speaking-task34-image-prompt";
import { type Task34SceneProfile } from "./speaking-image-style";
import { checkTask34Image } from "./speaking-image-vision";
import { SPEAKING_TASK34_REQUIREMENT } from "./speaking-task34-requirement";
import {
  failureFromVisionCheck,
  planTask34Scene,
  type PlanTask34SceneResult,
  type Task34ScenePlan,
} from "./speaking-task34-scene-planner";

const MIN_ACTIVITIES = 5;
const MIN_ACTIVITIES_FALLBACK = 4;
const MAX_ATTEMPTS = 7;

export type Task34ImageGenResult =
  | {
      ok: true;
      base64: string;
      stabilityPrompt: string;
      stabilitySeed: number;
      activityCount: number;
      singleSnapshot: boolean;
      attempts: number;
      validationWarning?: string;
      scene: Task34SceneProfile;
      scenePlan: Task34ScenePlan;
      scenePlannedBy: "llm" | "fallback" | "curated";
    }
  | { ok: false; error: string; attempts: number };

function promptModeForAttempt(
  attempt: number,
  scene: Task34SceneProfile,
  plannedBy: "llm" | "fallback" | "curated",
  lastCheck?: { activitiesDiverse: boolean; count: number; actionableActivities: boolean },
): Task34PromptMode {
  const useTemplate =
    plannedBy === "curated" &&
    Boolean(scene.stabilityLines?.length) &&
    /swimming pool|supermarket checkout/i.test(scene.setting);

  if (useTemplate && (attempt === 1 || attempt >= 6)) {
    return "template";
  }
  if (lastCheck && !lastCheck.activitiesDiverse && attempt >= 2) {
    return useTemplate ? "template" : "physical_retry";
  }
  if (lastCheck && lastCheck.count < 2 && attempt >= 2) {
    return "people_retry";
  }
  if (
    lastCheck &&
    (!lastCheck.activitiesDiverse || lastCheck.count < MIN_ACTIVITIES) &&
    attempt >= 3
  ) {
    return "diversity_retry";
  }
  if (attempt <= 2) return "standard";
  if (attempt <= 5) return "snapshot_retry";
  return useTemplate ? "template" : "snapshot_retry";
}

async function replanSceneForAttempt(
  attempt: number,
  failure: ReturnType<typeof failureFromVisionCheck>,
): Promise<PlanTask34SceneResult> {
  if (failure.diversityFailed && attempt >= 6) {
    const template = attempt % 2 === 0 ? "supermarket" : "pool";
    const { planTask34TemplateScene } = await import("./speaking-task34-scene-planner");
    return planTask34TemplateScene(template);
  }
  return planTask34Scene(failure);
}

function expectedActivities(scene: Task34SceneProfile): string[] {
  return scene.focalPoints.map((fp) =>
    fp.replace(/^(LEFT|RIGHT|CENTRE(?:-LEFT|-RIGHT)?):\s*/i, "").trim(),
  );
}

function buildValidationWarning(
  check: Awaited<ReturnType<typeof checkTask34Image>>,
): string | undefined {
  const parts: string[] = [];
  if (check.count < MIN_ACTIVITIES) {
    parts.push(`vision counted ${check.count} activities (target 5)`);
  } else if (check.count > 5) {
    parts.push(`vision counted ${check.count} activities (too many — keep 5)`);
  }
  if (!check.activitiesDiverse) {
    parts.push("2+ groups share the same action category (e.g. all desk/study)");
  }
  if (!check.equalFocus) {
    parts.push("some activity groups were hard to spot equally");
  }
  if (!check.clearComposition) {
    parts.push("composition looked chaotic or hard to read");
  }
  if (!check.actionableActivities) {
    parts.push("activities looked too idle — not enough obvious actions to discuss");
  }
  return parts.length ? parts.join("; ") : undefined;
}

function scoreCheck(
  check: Awaited<ReturnType<typeof checkTask34Image>>,
): number {
  let score = check.count * 10;
  if (check.count === 0) score -= 100;
  if (check.actionableActivities) score += 12;
  if (check.activitiesDiverse) score += 20;
  if (check.clearComposition) score += 4;
  if (check.equalFocus) score += 2;
  if (check.count >= MIN_ACTIVITIES) score += 5;
  return score;
}

function issueFromCheck(
  check: Awaited<ReturnType<typeof checkTask34Image>>,
): string {
  if (!check.activitiesDiverse) {
    return "2+ groups share the same action category";
  }
  if (check.count < 2) {
    return "too few people or activities visible (empty or near-empty scene)";
  }
  if (check.count < MIN_ACTIVITIES) {
    return `only ${check.count} clear activities visible (need ${MIN_ACTIVITIES}+)`;
  }
  if (!check.actionableActivities) {
    return "groups look too idle or social";
  }
  return "image did not pass all quality checks";
}

function saveBestResult(
  best: {
    base64: string;
    stabilityPrompt: string;
    stabilitySeed: number;
    check: Awaited<ReturnType<typeof checkTask34Image>>;
    attempt: number;
    scene: Task34SceneProfile;
    scenePlan: Task34ScenePlan;
    scenePlannedBy: "llm" | "fallback" | "curated";
  },
  maxAttempts: number,
): Extract<Task34ImageGenResult, { ok: true }> {
  const warning = buildValidationWarning(best.check);
  console.log(
    `[speaking] Task 3/4: using best of ${maxAttempts} attempts on try ${best.attempt}${warning ? ` (${warning})` : ""}`,
  );
  return {
    ok: true,
    base64: best.base64,
    stabilityPrompt: best.stabilityPrompt,
    stabilitySeed: best.stabilitySeed,
    activityCount: best.check.count,
    singleSnapshot: true,
    attempts: best.attempt,
    validationWarning: warning,
    scene: best.scene,
    scenePlan: best.scenePlan,
    scenePlannedBy: best.scenePlannedBy,
  };
}

/**
 * Hybrid Task 3/4 pipeline: LLM plans scene → Stability draws → vision QA (replan on fail).
 */
export async function generateValidatedTask34Image(): Promise<Task34ImageGenResult> {
  const skipCheck = process.env.SPEAKING_SKIP_TASK34_ACTIVITY_CHECK === "true";
  const provider = (process.env.SPEAKING_IMAGE_PROVIDER || "stability").trim().toLowerCase();
  if (provider === "fal") {
    console.log(
      `[speaking] Task 3/4: up to ${MAX_ATTEMPTS} image attempts (provider: ${provider}) — complex scenes may need several tries`,
    );
  }
  let lastError = "Image generation failed";
  let lastCheck: Awaited<ReturnType<typeof checkTask34Image>> | undefined;
  const triedSettings: string[] = [];

  const initial = await planTask34Scene();
  let scene = initial.scene;
  let scenePlan = initial.plan;
  let scenePlannedBy = initial.plannedBy;
  triedSettings.push(scene.setting);
  let planned = expectedActivities(scene);

  let bestRelaxed: {
    base64: string;
    stabilityPrompt: string;
    stabilitySeed: number;
    check: Awaited<ReturnType<typeof checkTask34Image>>;
    attempt: number;
    scene: Task34SceneProfile;
    scenePlan: Task34ScenePlan;
    scenePlannedBy: "llm" | "fallback" | "curated";
  } | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1 && lastCheck && !lastCheck.acceptable) {
      const replanned = await replanSceneForAttempt(
        attempt,
        failureFromVisionCheck(scene, lastCheck, lastError, triedSettings),
      );
      scene = replanned.scene;
      scenePlan = replanned.plan;
      scenePlannedBy = replanned.plannedBy;
      if (!triedSettings.includes(scene.setting)) {
        triedSettings.push(scene.setting);
      }
      planned = expectedActivities(scene);
    }

    const stabilitySeed = Math.floor(Math.random() * 4294967294) + 1;
    const promptMode = promptModeForAttempt(attempt, scene, scenePlannedBy, lastCheck);
    const useFal = speakingImageProvider() === "fal";
    const stabilityPrompt =
      useFal ?
        buildTask34ImagePromptFromPlan(scenePlan)
      : buildTask34ImagePrompt(scene, promptMode);

    const imageOptions = {
      rawPrompt: true,
      seed: stabilitySeed,
      useComicPreset: false,
      aspectRatio: "1:1" as const,
      retryFalDespiteBillingLock: true,
      ...(useFal ?
        { falPromptFallback: buildTask34ImagePromptForFalMinimal(scene, scenePlan) }
      : {}),
      ...(speakingImageProvider() === "stability" ?
        { stylePreset: "digital-art" }
      : {}),
    };

    const gen = await generateSpeakingImage(stabilityPrompt, 3, imageOptions);

    if (!gen.ok) {
      lastError = gen.error;
      continue;
    }

    if (skipCheck) {
      return {
        ok: true,
        base64: gen.base64,
        stabilityPrompt,
        stabilitySeed,
        activityCount: scene.focalPoints.length,
        singleSnapshot: true,
        attempts: attempt,
        scene,
        scenePlan,
        scenePlannedBy,
      };
    }

    const check = await checkTask34Image(gen.base64, { expectedActivities: planned });
    lastCheck = check;

    if (!check.singleSnapshot) {
      lastError =
        "Model returned multiple snapshots or panels — retrying for ONE cartoon illustration.";
      continue;
    }

    if (!check.singleScene) {
      lastError = "Image looked like different places — retrying.";
      continue;
    }

    if (check.singleSnapshot && check.singleScene) {
      if (
        !bestRelaxed ||
        scoreCheck(check) > scoreCheck(bestRelaxed.check) ||
        (scoreCheck(check) === scoreCheck(bestRelaxed.check) &&
          check.count > bestRelaxed.check.count)
      ) {
        bestRelaxed = {
          base64: gen.base64,
          stabilityPrompt,
          stabilitySeed,
          check,
          attempt,
          scene,
          scenePlan,
          scenePlannedBy,
        };
      }
    }

    if (check.acceptable) {
      if (attempt > 1) {
        console.log(`[speaking] Task 3/4: accepted on attempt ${attempt}/${MAX_ATTEMPTS}`);
      }
      return {
        ok: true,
        base64: gen.base64,
        stabilityPrompt,
        stabilitySeed,
        activityCount: check.count,
        singleSnapshot: true,
        attempts: attempt,
        scene,
        scenePlan,
        scenePlannedBy,
      };
    }

    lastError = issueFromCheck(check);

    console.log(
      `[speaking] Task 3/4 attempt ${attempt}/${MAX_ATTEMPTS}: count=${check.count} diverse=${check.activitiesDiverse ? "yes" : "no"} mode=${promptMode} plan=${scenePlannedBy} scene="${scene.setting.slice(0, 50)}"${check.notes ? ` — ${check.notes}` : ""}`,
    );
  }

  if (bestRelaxed) {
    const { check } = bestRelaxed;
    if (check.count >= MIN_ACTIVITIES && check.activitiesDiverse) {
      return saveBestResult(bestRelaxed, MAX_ATTEMPTS);
    }
    if (check.count >= MIN_ACTIVITIES && check.singleSnapshot && check.singleScene) {
      return saveBestResult(bestRelaxed, MAX_ATTEMPTS);
    }
    if (check.count >= MIN_ACTIVITIES_FALLBACK && check.actionableActivities) {
      return saveBestResult(bestRelaxed, MAX_ATTEMPTS);
    }
    if (
      check.count >= 2 &&
      check.actionableActivities &&
      check.singleSnapshot &&
      check.singleScene
    ) {
      return saveBestResult(bestRelaxed, MAX_ATTEMPTS);
    }
  }

  console.log(
    `[speaking] Task 3/4: failed after ${MAX_ATTEMPTS} attempts (${lastError})`,
  );
  return {
    ok: false,
    error: lastError,
    attempts: MAX_ATTEMPTS,
  };
}

export { SPEAKING_TASK34_REQUIREMENT };
