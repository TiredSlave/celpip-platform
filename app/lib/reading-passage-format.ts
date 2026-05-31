export type LabeledParagraph = { label: string; body: string };

const LABEL_ORDER = ["A", "B", "C", "D"] as const;

/** Parse CELPIP-style A–D labeled reading passage for display. */
export function parseReadingLabeledPassage(passage: string): LabeledParagraph[] | null {
  const trimmed = passage.trim();
  if (!trimmed) return null;

  const labeled: LabeledParagraph[] = [];
  const re = /(?:^|\n\n)([A-D])\s*\n+([\s\S]*?)(?=\n\n[A-D]\s*\n+|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(trimmed)) !== null) {
    labeled.push({
      label: match[1].toUpperCase(),
      body: match[2].trim(),
    });
  }
  if (labeled.length === 4 && labeled.every((p, i) => p.label === LABEL_ORDER[i])) {
    return labeled;
  }

  const inline = [...trimmed.matchAll(/(?:^|\n\n)([A-D])[.:]?\s*\n+([\s\S]*?)(?=\n\n[A-D][.:]?\s*\n+|$)/gm)];
  if (inline.length === 4) {
    const fromInline = inline.map((m) => ({
      label: m[1].toUpperCase(),
      body: m[2].trim(),
    }));
    if (fromInline.every((p, i) => p.label === LABEL_ORDER[i])) return fromInline;
  }

  const chunks = trimmed.split(/\n\n+/).filter(Boolean);
  if (chunks.length === 4) {
    // Always assign A–D by paragraph position so labels stay unique for React keys.
    return chunks.map((chunk, i) => ({
      label: LABEL_ORDER[i],
      body: chunk.replace(/^[A-D][.:]?\s*\n?/i, "").trim(),
    }));
  }

  return null;
}

/** Ensure passage text uses A–D labels (for post-processing generated content). */
export function ensureReadingPassageLabels(passage: string): string {
  const parsed = parseReadingLabeledPassage(passage);
  if (parsed?.length === 4) {
    return parsed.map((p) => `${p.label}\n\n${p.body}`).join("\n\n");
  }

  const chunks = passage.trim().split(/\n\n+/).filter(Boolean);
  if (chunks.length === 4) {
    return chunks
      .map((chunk, i) => {
        const stripped = chunk.replace(/^[A-D][.:]?\s*\n?/i, "").trim();
        return `${LABEL_ORDER[i]}\n\n${stripped}`;
      })
      .join("\n\n");
  }

  return passage;
}
