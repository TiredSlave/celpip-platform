import {
  buildStabilityImagePrompt,
  CELPIP_IMAGE_DENSITY_PREFIX,
  SPEAKING_IMAGE_NEGATIVE_EXTRA,
  SPEAKING_IMAGE_NEGATIVE_PETS,
  SPEAKING_IMAGE_NEGATIVE_SPARSE,
} from "./speaking-image-style";
import { SINGLE_SNAPSHOT_NEGATIVE_EXTRA, TASK8_NORMAL_SCENE_NEGATIVE } from "./speaking-single-snapshot";
import { falKey } from "./speaking-image-fal-config";
import {
  getSpeakingImageRuntimeInfo,
  logSpeakingImageAttempt,
  parseSpeakingImageProvider,
} from "./speaking-image-provider";

export type SpeakingImageGenResult =
  | { ok: true; base64: string }
  | { ok: false; error: string };

const MAX_PROMPT_CHARS = 3200;

export function buildNegativePrompt(taskNumber?: number): string {
  const parts = [
    "blurry",
    "distorted",
    "text",
    "letters",
    "words",
    "watermark",
    "nsfw",
    "violence",
    SPEAKING_IMAGE_NEGATIVE_EXTRA,
  ];
  if (taskNumber === 3 || taskNumber === 4) {
    parts.push(
      "overcrowded, cluttered, chaotic, too many people, busy crowd, visual noise, messy background, scattered props, junk everywhere, hyper detail, trivia objects, twelve people, large group",
      "neon rainbow, kaleidoscope, muddy blur, unreadable blob faces",
      "people sitting idle, waiting room boredom, empty waiting, static pose",
      "empty patio, vacant room, no people, furniture only, empty tables and chairs, deserted cafe, scene without people, architectural rendering without figures",
      "children sitting socializing, playground chatting, idle standing group, people milling with no action",
      "single activity only, one dominant figure, hero shot, close-up portrait, clone identical people, only two activities, only three activities, only four activities, six activities, seven activities",
      "repeated similar actions, everyone helping, everyone handing, same gesture copied, duplicate poses",
      "everyone typing writing reading at desks, office coworking, study hall, library study tables, four people seated doing desk work, same seated category",
      "seated circle, group discussion, meeting round table, seminar, conference, classroom circle, people in chairs with papers, notebooks, clipboards, study group, book club, lecture hall",
      "indoor library reading room, office meeting, waiting room all seated, museum lecture",
      "classroom, schoolroom, students at desks, teacher at desk, chalkboard lesson, lecture hall audience, bleachers, spectators seated watching, grandstand crowd",
      "outdoor volcano field trip, children sitting on grass with worksheets, note-taking crowd, milling school group",
      SINGLE_SNAPSHOT_NEGATIVE_EXTRA,
    );
  } else {
    parts.push("farm", "agriculture", "farmers market", "produce market");
  }
  if (taskNumber !== 3 && taskNumber !== 5) {
    parts.push(SPEAKING_IMAGE_NEGATIVE_SPARSE);
  }
  if (taskNumber === 5) {
    parts.push(
      "crowded party, many people, large group of people, social gathering as main focus, twelve people, busy crowd, faces close-up portrait, people posing",
      SINGLE_SNAPSHOT_NEGATIVE_EXTRA,
    );
  }
  if (taskNumber === 8) {
    parts.push(SPEAKING_IMAGE_NEGATIVE_PETS);
    parts.push(
      "normal routine scene, ordinary everyday activity, nothing out of place, boring generic street, busy marketplace crowd, twelve unrelated activities, mildly uncommon, seasonal oddity, slightly unusual but plausible, conference room, business meeting, office meeting",
      SINGLE_SNAPSHOT_NEGATIVE_EXTRA,
      TASK8_NORMAL_SCENE_NEGATIVE,
    );
  }
  return parts.join(", ");
}

/** Trim long prompts — always preserve Scene: and activity layers (tail of prompt). */
export function trimStabilityPrompt(prompt: string, max = MAX_PROMPT_CHARS): string {
  if (prompt.length <= max) return prompt;

  const sceneIdx = prompt.indexOf("Scene:");
  const squareIdx = prompt.indexOf("Square CELPIP");
  const contentIdx =
    sceneIdx >= 0 ? sceneIdx : squareIdx >= 0 ? squareIdx : prompt.indexOf("MUST show");

  if (contentIdx > 0) {
    const head = prompt.slice(0, Math.min(contentIdx, 260)).trim();
    const tail = prompt.slice(contentIdx);
    const budget = max - head.length - 1;
    if (budget > 400) {
      return `${head} ${tail.slice(0, budget)}`;
    }
  }

  const snapshotStart = prompt.indexOf("ONE PHOTOGRAPH");
  if (snapshotStart > 0) {
    const headBudget = Math.min(400, snapshotStart);
    const head = prompt.slice(0, headBudget);
    const body = prompt.slice(snapshotStart);
    const bodyBudget = max - head.length - 4;
    if (bodyBudget > 250) {
      return `${head}... ${body.slice(0, bodyBudget)}`;
    }
  }

  const prefix = CELPIP_IMAGE_DENSITY_PREFIX;
  const idx = prompt.indexOf(prefix);
  if (idx === 0) {
    const tail = prompt.slice(prefix.length + 2);
    const budget = max - prefix.length - 4;
    return `${prefix}, ${tail.slice(0, Math.max(200, budget))}`;
  }
  return prompt.slice(0, max);
}

export type SpeakingImageGenOptions = {
  /** When true, do not wrap with CELPIP density prefix (Task 3/8 use focal prompts). */
  rawPrompt?: boolean;
  /** Stability seed (1–4294967294). Omit for random. */
  seed?: number;
  /** comic-book preset causes multi-panel layouts — off for Task 3/4/5/8 single photographs. */
  useComicPreset?: boolean;
  /** Task 3/4/5/8 use square 1:1 (official CELPIP-style framing). */
  aspectRatio?: "1:1" | "16:9" | "9:16";
  /** Stability style_preset — digital-art tends to follow activity lists better than default. */
  stylePreset?: string;
  /** When true, retry Fal even if a recent billing lock was seen (Task 3/4 multi-attempt loop). */
  retryFalDespiteBillingLock?: boolean;
  /** Second Fal submit if the first prompt hits content_policy (pre-sanitized short prompt). */
  falPromptFallback?: string;
};

export function speakingImageProvider(): "stability" | "fal" {
  return parseSpeakingImageProvider();
}

const FAL_LOCK_TTL_MS = 15_000;
let falBillingLock: { key: string; until: number } | null = null;
let lastFalSuccessAt = 0;

function falBillingLockedNow(): boolean {
  if (!falBillingLock) return false;
  if (Date.now() > falBillingLock.until) {
    falBillingLock = null;
    return false;
  }
  const currentKey = falKey() ?? "";
  if (currentKey && currentKey !== falBillingLock.key) {
    falBillingLock = null;
    return false;
  }
  return true;
}

function rememberFalBillingLock() {
  falBillingLock = {
    key: falKey() ?? "",
    until: Date.now() + FAL_LOCK_TTL_MS,
  };
}

function clearFalBillingLock() {
  falBillingLock = null;
}

export function isFalBillingLockError(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes("403") ||
    lower.includes("exhausted balance") ||
    lower.includes("user is locked") ||
    lower.includes("insufficient balance") ||
    lower.includes("insufficient credits")
  );
}

function stabilityApiKey(): string | null {
  return process.env.STABILITY_API_KEY?.trim() || null;
}

/** Stability AI v2 core with comic-book preset for exam-style cartoons. */
export async function generateSpeakingImageStability(
  prompt: string,
  taskNumber?: number,
  options?: SpeakingImageGenOptions,
): Promise<SpeakingImageGenResult> {
  const apiKey = process.env.STABILITY_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "STABILITY_API_KEY is missing. Add it to .env.local and restart the dev server.",
    };
  }

  const positive = trimStabilityPrompt(
    options?.rawPrompt
      ? prompt
      : prompt.includes(CELPIP_IMAGE_DENSITY_PREFIX)
        ? prompt
        : buildStabilityImagePrompt(taskNumber, prompt),
  );

  async function requestImage(useComicPreset: boolean, stylePreset?: string): Promise<Response> {
    const formData = new FormData();
    formData.append("prompt", positive);
    formData.append("negative_prompt", buildNegativePrompt(taskNumber));
    formData.append("output_format", "png");
    formData.append("aspect_ratio", options?.aspectRatio ?? "1:1");
    if (options?.seed) {
      formData.append("seed", String(options.seed));
    }
    if (stylePreset) {
      formData.append("style_preset", stylePreset);
    } else if (useComicPreset) {
      formData.append("style_preset", "comic-book");
    }
    return fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "image/*",
      },
      body: formData,
    });
  }

  const useComic =
    options?.useComicPreset ??
    (taskNumber !== 3 &&
      taskNumber !== 4 &&
      taskNumber !== 5 &&
      taskNumber !== 8);

  const stylePreset = options?.stylePreset;

  try {
    let response = await requestImage(useComic, stylePreset);
    if (!response.ok) {
      const errText = await response.text();
      if (/style_preset|style preset/i.test(errText)) {
        response = await requestImage(false);
      } else {
        let detail = errText.slice(0, 400);
        try {
          const parsed = JSON.parse(errText) as { errors?: string[]; message?: string };
          detail = parsed.errors?.join("; ") || parsed.message || detail;
        } catch {
          /* use raw text */
        }
        return {
          ok: false,
          error: `Stability AI (${response.status}): ${detail}`,
        };
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      let detail = errText.slice(0, 400);
      try {
        const parsed = JSON.parse(errText) as { errors?: string[]; message?: string };
        detail = parsed.errors?.join("; ") || parsed.message || detail;
      } catch {
        /* use raw text */
      }
      return {
        ok: false,
        error: `Stability AI (${response.status}): ${detail}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer.byteLength) {
      return { ok: false, error: "Stability AI returned an empty image." };
    }

    return { ok: true, base64: Buffer.from(arrayBuffer).toString("base64") };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Image request failed: ${msg}` };
  }
}

/** Task 3/4/5/8 images — Stability or Fal via SPEAKING_IMAGE_PROVIDER. */
export async function generateSpeakingImage(
  prompt: string,
  taskNumber?: number,
  options?: SpeakingImageGenOptions,
): Promise<SpeakingImageGenResult> {
  const runtime = getSpeakingImageRuntimeInfo();

  const skipFalDueToLock =
    falBillingLockedNow() && !options?.retryFalDespiteBillingLock;
  const preferFal = runtime.configuredProvider === "fal" && !skipFalDueToLock;

  if (preferFal) {
    logSpeakingImageAttempt("fal");
    const { generateSpeakingImageFal } = await import("./speaking-image-fal");
    const falResult = await generateSpeakingImageFal(prompt, taskNumber, options);

    if (falResult.ok) {
      clearFalBillingLock();
      lastFalSuccessAt = Date.now();
      console.log(
        `[speaking-image] Generated with Fal model=${runtime.falModel} key=${runtime.falKeyFingerprint}`,
      );
      return falResult;
    }

    const billingLock = isFalBillingLockError(falResult.error);
    const shouldFallback =
      billingLock || /fal_key is missing/i.test(falResult.error);

    if (shouldFallback) {
      if (billingLock) {
        rememberFalBillingLock();
        const afterSuccess =
          lastFalSuccessAt > 0 && Date.now() - lastFalSuccessAt < 120_000;
        console.warn(
          `[speaking-image] Fal billing lock for key ${runtime.falKeyFingerprint}: ${falResult.error.slice(0, 160)}`,
        );
        if (afterSuccess && (taskNumber === 3 || taskNumber === 4)) {
          console.warn(
            "[speaking-image] Fal worked moments ago but now returns exhausted balance. " +
              "Task 3/4 needs up to 7 images — top up fal.ai billing or use a cheaper FAL_FLUX_MODEL. " +
              "Remaining attempts in this run may fall back to Stability AI.",
          );
        }
      }

      if (runtime.falFallbackEnabled && stabilityApiKey()) {
        logSpeakingImageAttempt("stability", "Fal failed — fallback");
        return generateSpeakingImageStability(prompt, taskNumber, options);
      }

      return {
        ok: false,
        error: `${falResult.error} Fal key ${runtime.falKeyFingerprint} is still rejected by fal.ai. Confirm the dashboard account matches this API key, or email support@fal.ai. To disable Stability fallback while debugging, set SPEAKING_IMAGE_FAL_FALLBACK=false.`,
      };
    }

    return { ok: false, error: falResult.error };
  }

  if (runtime.configuredProvider === "fal" && skipFalDueToLock) {
    if (runtime.falFallbackEnabled && stabilityApiKey()) {
      logSpeakingImageAttempt(
        "stability",
        `Fal skipped (recent billing lock on key ${runtime.falKeyFingerprint})`,
      );
      return generateSpeakingImageStability(prompt, taskNumber, options);
    }
  }

  logSpeakingImageAttempt("stability");
  return generateSpeakingImageStability(prompt, taskNumber, options);
}
