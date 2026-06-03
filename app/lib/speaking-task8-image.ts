import { generateSpeakingImage } from "./speaking-image-generate";
import {
  buildTask8LockedContent,
  buildTask8StabilityPrompt,
  pickTask8Scene,
  randomStabilitySeed,
  type Task8SceneProfile,
} from "./speaking-image-style";
import {
  alignTask8ContentToImage,
  checkTask8Image,
  type Task8VisionAlignResult,
} from "./speaking-image-vision";

const MAX_ATTEMPTS = 4;

function skipTask8ImageCheck() {
  return process.env.SPEAKING_SKIP_TASK8_IMAGE_CHECK === "true";
}

export type Task8ImageGenResult =
  | {
      ok: true;
      base64: string;
      stabilityPrompt: string;
      stabilitySeed: number;
      attempts: number;
    }
  | { ok: false; error: string; attempts: number };

/**
 * Task 8: ONE editorial cartoon + ONE absurd unimaginable action. Never save panel grids or normal scenes.
 */
export async function generateValidatedTask8Image(
  scene: Task8SceneProfile = pickTask8Scene(),
): Promise<Task8ImageGenResult> {
  let lastError = "Image generation failed";
  const attemptNotes: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const stabilitySeed = randomStabilitySeed();
    const stabilityPrompt = buildTask8StabilityPrompt(
      scene,
      attempt > 1 ? "snapshot_retry" : "standard",
    );

    const gen = await generateSpeakingImage(stabilityPrompt, 8, {
      rawPrompt: true,
      seed: stabilitySeed,
      useComicPreset: false,
      aspectRatio: "1:1",
    });

    if (!gen.ok) {
      lastError = gen.error;
      attemptNotes.push(`#${attempt} stability failed`);
      continue;
    }

    if (skipTask8ImageCheck()) {
      return {
        ok: true,
        base64: gen.base64,
        stabilityPrompt,
        stabilitySeed,
        attempts: attempt,
      };
    }

    const check = await checkTask8Image(gen.base64, {
      scene: scene.scene,
      whyUnusual: scene.whyUnusual,
    });

    if (check.acceptable) {
      if (attempt > 1) {
        console.log(
          `[speaking] Task 8: accepted on attempt ${attempt}/${MAX_ATTEMPTS}`,
        );
      }
      return {
        ok: true,
        base64: gen.base64,
        stabilityPrompt,
        stabilitySeed,
        attempts: attempt,
      };
    }

    if (!check.singleSnapshot) {
      lastError = check.notes || "Panel grid or comic strip — need one unified picture.";
      attemptNotes.push(`#${attempt} panel grid`);
    } else if (!check.absurdUnusual) {
      lastError =
        check.notes || "Scene looks normal or routine — need absurd wrong-place action.";
      attemptNotes.push(`#${attempt} not absurd`);
    } else {
      lastError = check.notes || "Image check failed.";
      attemptNotes.push(`#${attempt} rejected`);
    }
  }

  console.log(
    `[speaking] Task 8: failed after ${MAX_ATTEMPTS} attempts (${attemptNotes.join(", ")})`,
  );
  return { ok: false, error: lastError, attempts: MAX_ATTEMPTS };
}

export async function assembleTask8Content(
  scene: Task8SceneProfile,
  imageUrl: string | null,
  gen: Extract<Task8ImageGenResult, { ok: true }>,
) {
  let aligned: Task8VisionAlignResult | null = null;
  for (let attempt = 1; attempt <= 2 && !aligned; attempt++) {
    aligned = await alignTask8ContentToImage(gen.base64, scene);
  }

  const base = buildTask8LockedContent(scene);
  const generationScript = {
    scene_setting: scene.title,
    bizarre_action: scene.scene,
    why_unusual: scene.whyUnusual,
    visual_plan: scene.visualFocus,
    stability_prompt: gen.stabilityPrompt,
    stability_seed: gen.stabilitySeed,
    vision_description: aligned?.visual_description,
  };

  if (aligned) {
    return {
      ...base,
      situation: aligned.situation,
      scene_summary: aligned.scene_summary,
      why_unusual: aligned.scene_summary || scene.whyUnusual,
      visual_description: aligned.visual_description,
      image_prompt: aligned.visual_description,
      sample_answer: aligned.sample_answer,
      sample_answer_band: aligned.sample_answer_band,
      sample_answer_notes: [
        "Describes the generated image (vision-aligned)",
        "Explains why the situation is unimaginable and absurd",
      ],
      image_url: imageUrl,
      image_grounded: true,
      scene_profile: scene.title,
      generation_script: generationScript,
    };
  }

  return {
    ...base,
    image_url: imageUrl,
    image_grounded: false,
    scene_profile: scene.title,
    generation_script: generationScript,
    sample_answer_notes: [
      "Image failed quality check (panel grid or not absurd enough) — regenerate Task 8",
    ],
  };
}

export type { Task8VisionAlignResult };
