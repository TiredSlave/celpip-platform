import {
  buildStabilityImagePrompt,
  CELPIP_IMAGE_DENSITY_PREFIX,
} from "./speaking-image-style";
import {
  trimStabilityPrompt,
  type SpeakingImageGenOptions,
  type SpeakingImageGenResult,
} from "./speaking-image-generate";
import { falKey, falModelId } from "./speaking-image-fal-config";
import {
  buildFalSafeAvoidClause,
  FAL_TASK34_VISUAL_STYLE,
  isFalContentPolicyError,
  sanitizePromptForFal,
} from "./speaking-image-fal-prompt";

export { falKey, falModelId } from "./speaking-image-fal-config";
export { isFalContentPolicyError } from "./speaking-image-fal-prompt";

const QUEUE_POLL_MS = 2000;
const QUEUE_MAX_WAIT_MS = 180_000;

function falImageSize(
  aspectRatio?: SpeakingImageGenOptions["aspectRatio"],
): string | { width: number; height: number } {
  if (aspectRatio === "16:9") return "landscape_16_9";
  if (aspectRatio === "9:16") return "portrait_16_9";
  return "square_hd";
}

function buildFalPrompt(
  prompt: string,
  taskNumber?: number,
  options?: SpeakingImageGenOptions,
): string {
  const positive = trimStabilityPrompt(
    options?.rawPrompt ?
      sanitizePromptForFal(prompt)
    : prompt.includes(CELPIP_IMAGE_DENSITY_PREFIX) ?
      sanitizePromptForFal(prompt)
    : sanitizePromptForFal(buildStabilityImagePrompt(taskNumber, prompt)),
  );

  const avoid = buildFalSafeAvoidClause(taskNumber);
  const style =
    taskNumber === 3 || taskNumber === 4 ?
      `Style: ${FAL_TASK34_VISUAL_STYLE}, uncluttered, no readable text`
    : "Style: friendly flat CELPIP exam cartoon, clear colors, uncluttered, no readable text";
  return sanitizePromptForFal(`${positive}. ${style}. Avoid: ${avoid}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image (${res.status})`);
  }
  const buf = await res.arrayBuffer();
  if (!buf.byteLength) {
    throw new Error("Fal returned an empty image file");
  }
  return Buffer.from(buf).toString("base64");
}

type FalQueueStatus = {
  status?: string;
  error?: string;
  detail?: string;
};

type FalImageOutput = {
  images?: { url?: string }[];
  image?: { url?: string };
  data?: { images?: { url?: string }[] };
};

function imageUrlFromFalPayload(payload: FalImageOutput): string | null {
  const fromList = payload.images?.[0]?.url;
  if (fromList) return fromList;
  if (payload.image?.url) return payload.image.url;
  return payload.data?.images?.[0]?.url ?? null;
}

function extractFalErrorText(errText: string): string {
  return errText.slice(0, 500);
}

async function pollFalQueueResult(
  modelId: string,
  requestId: string,
  apiKey: string,
): Promise<FalImageOutput> {
  const statusUrl = `https://queue.fal.run/${modelId}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/${modelId}/requests/${requestId}`;
  const headers = { Authorization: `Key ${apiKey}` };
  const deadline = Date.now() + QUEUE_MAX_WAIT_MS;

  while (Date.now() < deadline) {
    const statusRes = await fetch(statusUrl, { headers });
    if (!statusRes.ok) {
      const t = await statusRes.text();
      throw new Error(`Fal status (${statusRes.status}): ${extractFalErrorText(t)}`);
    }

    const status = (await statusRes.json()) as FalQueueStatus;
    const state = String(status.status ?? "").toUpperCase();

    if (state === "COMPLETED") {
      const resultRes = await fetch(resultUrl, { headers });
      if (!resultRes.ok) {
        const t = await resultRes.text();
        throw new Error(`Fal result (${resultRes.status}): ${extractFalErrorText(t)}`);
      }
      return (await resultRes.json()) as FalImageOutput;
    }

    if (state === "FAILED" || state === "CANCELLED") {
      throw new Error(
        status.error || status.detail || `Fal request ${state.toLowerCase()}`,
      );
    }

    await sleep(QUEUE_POLL_MS);
  }

  throw new Error("Fal timed out waiting for image (queue)");
}

async function submitFalImage(
  modelId: string,
  apiKey: string,
  fullPrompt: string,
  options?: SpeakingImageGenOptions,
): Promise<{ ok: true; requestId: string } | { ok: false; error: string }> {
  const input: Record<string, unknown> = {
    prompt: fullPrompt,
    image_size: falImageSize(options?.aspectRatio),
    num_images: 1,
    output_format: "png",
    enhance_prompt: false,
    safety_tolerance: "5",
  };
  if (options?.seed) {
    input.seed = options.seed;
  }

  const submitRes = await fetch(`https://queue.fal.run/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    return {
      ok: false,
      error: `Fal submit (${submitRes.status}): ${extractFalErrorText(errText)}`,
    };
  }

  const submitted = (await submitRes.json()) as { request_id?: string };
  const requestId = submitted.request_id;
  if (!requestId) {
    return { ok: false, error: "Fal did not return a request_id" };
  }

  return { ok: true, requestId };
}

/** Fal.ai Flux — queue API. Retries once with a shorter prompt on content-policy errors. */
export async function generateSpeakingImageFal(
  prompt: string,
  taskNumber?: number,
  options?: SpeakingImageGenOptions,
): Promise<SpeakingImageGenResult> {
  const apiKey = falKey();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "FAL_KEY is missing. Add it to .env.local (from https://fal.ai/dashboard/keys) and set SPEAKING_IMAGE_PROVIDER=fal, then restart the dev server.",
    };
  }

  const modelId = falModelId();
  const prompts = [
    buildFalPrompt(prompt, taskNumber, options),
    ...(options?.falPromptFallback ?
      [sanitizePromptForFal(options.falPromptFallback)]
    : []),
  ];

  let lastError = "Fal request failed";

  for (let i = 0; i < prompts.length; i++) {
    const fullPrompt = prompts[i];
    try {
      const submitted = await submitFalImage(modelId, apiKey, fullPrompt, options);
      if (!submitted.ok) {
        lastError = submitted.error;
        if (isFalContentPolicyError(submitted.error) && i < prompts.length - 1) {
          console.warn(
            "[speaking-image] Fal content policy on submit — retrying with shorter safe prompt",
          );
          continue;
        }
        return { ok: false, error: submitted.error };
      }

      const payload = await pollFalQueueResult(modelId, submitted.requestId, apiKey);
      const imageUrl = imageUrlFromFalPayload(payload);
      if (!imageUrl) {
        return { ok: false, error: "Fal completed but returned no image URL" };
      }

      const base64 = await fetchImageAsBase64(imageUrl);
      return { ok: true, base64 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError = `Fal Flux Pro: ${msg}`;
      if (isFalContentPolicyError(msg) && i < prompts.length - 1) {
        console.warn(
          "[speaking-image] Fal content policy — retrying with shorter safe prompt",
        );
        continue;
      }
      return { ok: false, error: lastError };
    }
  }

  return { ok: false, error: lastError };
}
