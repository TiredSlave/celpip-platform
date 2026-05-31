import { generateSpeakingImage } from "./speaking-image-generate";
import {
  buildTask34ImagePrompt,
  type Task34PromptMode,
} from "./speaking-task34-image-prompt";
import { pickTask34Scene, type Task34SceneProfile } from "./speaking-image-style";
import { checkTask34Image } from "./speaking-image-vision";
import { SPEAKING_TASK34_REQUIREMENT } from "./speaking-task34-requirement";

const MIN_ACTIVITIES = 4;
const MIN_ACTIVITIES_FALLBACK = 3;
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
    }
  | { ok: false; error: string; attempts: number };

function promptModeForAttempt(
  attempt: number,
  lastCheck?: { activitiesDiverse: boolean; count: number },
): Task34PromptMode {
  if (lastCheck && (!lastCheck.activitiesDiverse || lastCheck.count < MIN_ACTIVITIES) && attempt >= 3) {
    return "diversity_retry";
  }
  if (attempt <= 2) return "standard";
  if (attempt <= 5) return "snapshot_retry";
  return "diversity_retry";
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
    parts.push(`vision counted ${check.count} activities (target 4–5)`);
  } else if (check.count > 5) {
    parts.push(`vision counted ${check.count} activities (too many — keep 4–5)`);
  }
  if (!check.activitiesDiverse) {
    parts.push("activities looked too similar");
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
  if (check.activitiesDiverse) score += 20;
  if (check.actionableActivities) score += 8;
  if (check.clearComposition) score += 4;
  if (check.equalFocus) score += 2;
  if (check.count >= MIN_ACTIVITIES) score += 5;
  return score;
}

function saveBestResult(
  best: {
    base64: string;
    stabilityPrompt: string;
    stabilitySeed: number;
    check: Awaited<ReturnType<typeof checkTask34Image>>;
    attempt: number;
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
  };
}

/**
 * One square snapshot, one scene, 5–7 clear unrelated activities (dense editorial cartoon).
 */
export async function generateValidatedTask34Image(
  scene: Task34SceneProfile = pickTask34Scene(),
): Promise<Task34ImageGenResult> {
  const skipCheck = process.env.SPEAKING_SKIP_TASK34_ACTIVITY_CHECK === "true";
  const planned = expectedActivities(scene);
  let lastError = "Image generation failed";
  let lastCheck: Awaited<ReturnType<typeof checkTask34Image>> | undefined;
  let bestRelaxed: {
    base64: string;
    stabilityPrompt: string;
    stabilitySeed: number;
    check: Awaited<ReturnType<typeof checkTask34Image>>;
    attempt: number;
  } | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const stabilitySeed = Math.floor(Math.random() * 4294967294) + 1;
    const stabilityPrompt = buildTask34ImagePrompt(
      scene,
      promptModeForAttempt(attempt, lastCheck),
    );

    const gen = await generateSpeakingImage(stabilityPrompt, 3, {
      rawPrompt: true,
      seed: stabilitySeed,
      useComicPreset: false,
      aspectRatio: "1:1",
    });

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
      };
    }

    if (!check.activitiesDiverse) {
      lastError = "Activities looked too similar — retrying for distinct verbs, poses, and props.";
    } else if (check.count < MIN_ACTIVITIES) {
      lastError = `Only ${check.count} clear activities visible (need ${MIN_ACTIVITIES}+).`;
    } else {
      lastError = "Image close but did not pass all quality checks — retrying.";
    }

    console.log(
      `[speaking] Task 3/4 attempt ${attempt}/${MAX_ATTEMPTS}: count=${check.count} diverse=${check.activitiesDiverse ? "yes" : "no"} mode=${promptModeForAttempt(attempt, lastCheck)}${check.notes ? ` — ${check.notes}` : ""}`,
    );
  }

  if (bestRelaxed) {
    const { check } = bestRelaxed;
    if (check.count >= MIN_ACTIVITIES && check.activitiesDiverse) {
      return saveBestResult(bestRelaxed, MAX_ATTEMPTS);
    }
    if (check.count >= MIN_ACTIVITIES_FALLBACK && check.actionableActivities) {
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
