import { generateSpeakingImage } from "./speaking-image-generate";
import {
  buildTask5LockedContent,
  buildTask5StabilityPrompt,
  randomStabilitySeed,
  type Task5ScenePair,
} from "./speaking-image-style";
import {
  alignTask5OptionToImage,
  type Task5OptionAlignResult,
} from "./speaking-image-vision";

const MAX_SIDE_ATTEMPTS = 4;

function skipTask5ImageCheck() {
  return process.env.SPEAKING_SKIP_TASK5_IMAGE_CHECK === "true";
}

/** Only reject when vision explicitly flags a panel grid (avoid false positives on single cartoons). */
function isPanelGridRejection(align: Task5OptionAlignResult): boolean {
  if (skipTask5ImageCheck()) return false;
  if (align.single_snapshot !== false) return false;
  const notes = (align.notes || "").toLowerCase();
  return /panel|grid|strip|storyboard|collage|multi.?frame|comic page|manga|gutter/.test(
    notes,
  );
}

type SideResult = {
  base64: string;
  stabilityPrompt: string;
  seed: number;
  align: Task5OptionAlignResult;
  attempts: number;
  panelWarning?: string;
};

async function generateOneTask5Side(
  pair: Task5ScenePair,
  side: "A" | "B",
): Promise<{ ok: true; result: SideResult } | { ok: false; error: string }> {
  const label = side === "A" ? pair.labelA : pair.labelB;
  const prompt = side === "A" ? pair.promptA : pair.promptB;
  const seedFacts = side === "A" ? pair.factsA : pair.factsB;

  let lastError = "Image generation failed";
  const attemptNotes: string[] = [];

  for (let attempt = 1; attempt <= MAX_SIDE_ATTEMPTS; attempt++) {
    const stabilityPrompt = buildTask5StabilityPrompt(
      pair,
      side,
      attempt > 1 ? "snapshot_retry" : "standard",
    );
    const seed = randomStabilitySeed();
    const gen = await generateSpeakingImage(stabilityPrompt, 5, {
      rawPrompt: true,
      seed,
      useComicPreset: false,
      aspectRatio: "1:1",
    });

    if (!gen.ok) {
      lastError = gen.error;
      attemptNotes.push(`#${attempt} stability: ${gen.error.slice(0, 40)}`);
      continue;
    }

    const align = await alignTask5OptionToImage(gen.base64, side, {
      label,
      prompt,
      seedFacts,
    });

    if (!align) {
      lastError = "Vision could not read the image (try again).";
      attemptNotes.push(`#${attempt} vision unreadable`);
      continue;
    }

    if (isPanelGridRejection(align)) {
      lastError =
        align.notes ||
        "Panel grid detected — retrying for one unified illustration.";
      attemptNotes.push(`#${attempt} panel grid`);
      continue;
    }

    if (attempt > 1) {
      console.log(
        `[speaking] Task 5 picture ${side}: ok on attempt ${attempt}/${MAX_SIDE_ATTEMPTS}`,
      );
    }

    return {
      ok: true,
      result: {
        base64: gen.base64,
        stabilityPrompt,
        seed,
        align,
        attempts: attempt,
        panelWarning:
          align.single_snapshot === false
            ? `Picture ${side}: vision noted layout concern but image accepted (${align.notes ?? "single scene"})`
            : undefined,
      },
    };
  }

  console.log(
    `[speaking] Task 5 picture ${side}: failed after ${MAX_SIDE_ATTEMPTS} attempts (${attemptNotes.join(", ")})`,
  );
  return { ok: false, error: lastError };
}

export type Task5ImageGenResult =
  | {
      ok: true;
      sideA: SideResult;
      sideB: SideResult;
      validationWarning?: string;
    }
  | { ok: false; error: string };

/** Generate A then B (sequential) to avoid Anthropic vision rate limits. */
export async function generateValidatedTask5Images(
  pair: Task5ScenePair,
): Promise<Task5ImageGenResult> {
  const genA = await generateOneTask5Side(pair, "A");
  if (!genA.ok) return { ok: false, error: `Picture A: ${genA.error}` };

  const genB = await generateOneTask5Side(pair, "B");
  if (!genB.ok) return { ok: false, error: `Picture B: ${genB.error}` };

  const warnings: string[] = [];
  if (genA.result.panelWarning) warnings.push(genA.result.panelWarning);
  if (genB.result.panelWarning) warnings.push(genB.result.panelWarning);
  if (genA.result.attempts > 1) {
    warnings.push(`Picture A needed ${genA.result.attempts} attempts.`);
  }
  if (genB.result.attempts > 1) {
    warnings.push(`Picture B needed ${genB.result.attempts} attempts.`);
  }
  if (genA.result.align.matches_expected === false) {
    warnings.push(
      `Picture A: labels adjusted from vision (${genA.result.align.notes ?? "option type"}).`,
    );
  }
  if (genB.result.align.matches_expected === false) {
    warnings.push(
      `Picture B: labels adjusted from vision (${genB.result.align.notes ?? "option type"}).`,
    );
  }

  return {
    ok: true,
    sideA: genA.result,
    sideB: genB.result,
    validationWarning: warnings.length ? warnings.join(" ") : undefined,
  };
}

export function assembleTask5Content(
  pair: Task5ScenePair,
  urls: { a: string | null; b: string | null },
  gen: Extract<Task5ImageGenResult, { ok: true }>,
) {
  const base = buildTask5LockedContent(pair);
  const alignA = gen.sideA.align;
  const alignB = gen.sideB.align;

  const labelA = alignA.short_label || pair.labelA;
  const labelB = alignB.short_label || pair.labelB;

  return {
    ...base,
    option_a: {
      ...base.option_a,
      label: `Picture A — ${labelA}`,
      image_prompt: alignA.visual_description || pair.promptA,
      facts: alignA.facts?.length ? alignA.facts : pair.factsA,
      image_url: urls.a,
    },
    option_b: {
      ...base.option_b,
      label: `Picture B — ${labelB}`,
      image_prompt: alignB.visual_description || pair.promptB,
      facts: alignB.facts?.length ? alignB.facts : pair.factsB,
      image_url: urls.b,
    },
    image_url_1: urls.a,
    image_url_2: urls.b,
    image_prompt: alignA.visual_description || pair.promptA,
    image_prompt_2: alignB.visual_description || pair.promptB,
    image_grounded: true,
    generation_script: {
      theme: pair.theme,
      scene_setting: pair.situation,
      option_a_label: labelA,
      option_b_label: labelB,
      visual_plan_a: pair.promptA,
      visual_plan_b: pair.promptB,
      vision_description_a: alignA.visual_description,
      vision_description_b: alignB.visual_description,
      stability_prompt_a: gen.sideA.stabilityPrompt,
      stability_prompt_b: gen.sideB.stabilityPrompt,
      stability_seed_a: gen.sideA.seed,
      stability_seed_b: gen.sideB.seed,
    },
  };
}
