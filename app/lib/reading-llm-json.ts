import Anthropic from "@anthropic-ai/sdk";

/** Strip markdown fences and isolate the outermost JSON object. */
export function cleanLlmJsonText(text: string): string {
  let s = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    s = s.slice(start, end + 1);
  }
  return s;
}

export function tryParseLlmJson<T = unknown>(text: string): T | null {
  const cleaned = cleanLlmJsonText(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/** Ask the model to repair truncated or invalid JSON (unescaped newlines in passage strings, etc.). */
export async function repairLlmJson(
  client: Anthropic,
  broken: string,
): Promise<string> {
  const snippet = broken.length > 48000 ? broken.slice(0, 48000) : broken;
  const resp = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    temperature: 0,
    system:
      "You fix invalid JSON. Return ONLY the corrected JSON object. No markdown. No commentary. Escape newlines inside strings as \\n. Escape double quotes inside strings as \\\".",
    messages: [
      {
        role: "user",
        content: `The following JSON failed to parse. Output valid JSON only:\n\n${snippet}`,
      },
    ],
  });
  const block = resp.content[0];
  return block.type === "text" ? block.text : "";
}

export async function parseLlmJsonWithRepair<T = unknown>(
  client: Anthropic,
  raw: string,
): Promise<T> {
  const first = tryParseLlmJson<T>(raw);
  if (first !== null) return first;

  const repaired = await repairLlmJson(client, cleanLlmJsonText(raw));
  const second = tryParseLlmJson<T>(repaired);
  if (second !== null) return second;

  throw new SyntaxError("Could not parse or repair LLM JSON response");
}
