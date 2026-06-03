import { falKey, falKeyFingerprint, falModelId } from "./speaking-image-fal-config";

export type SpeakingImageProviderName = "stability" | "fal";

export function parseSpeakingImageProvider(): SpeakingImageProviderName {
  const raw = (process.env.SPEAKING_IMAGE_PROVIDER || "stability").trim().toLowerCase();
  return raw === "fal" ? "fal" : "stability";
}

export function getSpeakingImageRuntimeInfo() {
  const configuredProvider = parseSpeakingImageProvider();
  const falK = falKey();
  return {
    configuredProvider,
    falKeyFingerprint: falKeyFingerprint(falK),
    falModel: falModelId(),
    hasFalKey: Boolean(falK),
    hasStabilityKey: Boolean(process.env.STABILITY_API_KEY?.trim()),
    falFallbackEnabled: process.env.SPEAKING_IMAGE_FAL_FALLBACK !== "false",
  };
}

/** Lightweight Fal billing probe — submits a minimal queue job (may consume a small credit). */
export async function probeFalAccount(apiKey: string = falKey() ?? ""): Promise<{
  ok: boolean;
  status: number;
  detail: string;
  keyFingerprint: string;
}> {
  const fingerprint = falKeyFingerprint(apiKey || null);
  if (!apiKey) {
    return { ok: false, status: 0, detail: "FAL_KEY is missing", keyFingerprint: fingerprint };
  }

  const modelId = falModelId();
  const res = await fetch(`https://queue.fal.run/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: "simple flat cartoon illustration, no text",
      image_size: "square_hd",
      num_images: 1,
    }),
  });

  const text = await res.text();
  let detail = text.slice(0, 400);
  try {
    const parsed = JSON.parse(text) as { detail?: string; message?: string };
    detail = parsed.detail || parsed.message || detail;
  } catch {
    /* use raw */
  }

  return {
    ok: res.ok,
    status: res.status,
    detail,
    keyFingerprint: fingerprint,
  };
}

export function logSpeakingImageAttempt(
  provider: SpeakingImageProviderName,
  note?: string,
) {
  const info = getSpeakingImageRuntimeInfo();
  const suffix = note ? ` — ${note}` : "";

  if (provider === "fal") {
    console.log(
      `[speaking-image] Trying Fal model=${info.falModel} key=${info.falKeyFingerprint}${suffix}`,
    );
    return;
  }

  console.log(
    `[speaking-image] Using Stability AI${info.hasStabilityKey ? "" : " (STABILITY_API_KEY missing)"}${suffix}`,
  );
}
