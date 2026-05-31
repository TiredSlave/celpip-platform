import {
  buildStabilityImagePrompt,
  CELPIP_IMAGE_DENSITY_PREFIX,
  SPEAKING_IMAGE_NEGATIVE_EXTRA,
  SPEAKING_IMAGE_NEGATIVE_PETS,
  SPEAKING_IMAGE_NEGATIVE_SPARSE,
} from "./speaking-image-style";
import { SINGLE_SNAPSHOT_NEGATIVE_EXTRA, TASK8_NORMAL_SCENE_NEGATIVE } from "./speaking-single-snapshot";

export type SpeakingImageGenResult =
  | { ok: true; base64: string }
  | { ok: false; error: string };

const MAX_PROMPT_CHARS = 3200;

function buildNegativePrompt(taskNumber?: number): string {
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
      "people sitting idle, waiting room boredom, everyone standing still, reading alone, no movement, empty waiting, static pose",
      "single activity only, one dominant figure, hero shot, close-up portrait, clone identical people, only two activities, only three activities, six activities, seven activities",
      "repeated similar actions, everyone helping, everyone handing, same gesture copied, duplicate poses",
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
};

/** Stability AI v2 core with comic-book preset for exam-style cartoons. */
export async function generateSpeakingImage(
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
