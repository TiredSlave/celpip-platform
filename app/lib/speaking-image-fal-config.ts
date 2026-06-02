const DEFAULT_MODEL = "fal-ai/flux-pro/v1.1";

export function falKey(): string | null {
  return (
    process.env.FAL_KEY?.trim() ||
    process.env.FAL_API_KEY?.trim() ||
    null
  );
}

export function falModelId(): string {
  return process.env.FAL_FLUX_MODEL?.trim() || DEFAULT_MODEL;
}

export function falKeyFingerprint(key: string | null = falKey()): string {
  if (!key) return "missing";
  const id = key.split(":")[0] ?? key;
  if (id.length <= 8) return id;
  return `…${id.slice(-8)}`;
}
