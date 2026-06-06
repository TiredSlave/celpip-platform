/** CELPIP Reading Part 3 — paragraph-matching MCQ with a fifth “not given” option. */

export const READING_PART3_OPTION_E_LABEL =
  "Information is not given in any paragraph";

export const READING_PART3_QUESTION_INSTRUCTION =
  "Decide which paragraph, A to D, has the information given in each statement below. Select E if the information is not given in any of the paragraphs.";

export const READING_PART3_MCQ_KEYS = ["A", "B", "C", "D", "E"] as const;

export type ReadingMcqQuestion = {
  id: number;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation?: string;
  option_explanations?: Record<string, string>;
};

/** Ensure Part 3 questions always expose A–E (backward-compatible with older 4-option tasks). */
export function normalizeReadingPart3Options(
  options: Record<string, string> | undefined,
): Record<string, string> {
  const base = options ?? {};
  return {
    A: base.A ?? "Paragraph A",
    B: base.B ?? "Paragraph B",
    C: base.C ?? "Paragraph C",
    D: base.D ?? "Paragraph D",
    E: base.E ?? READING_PART3_OPTION_E_LABEL,
  };
}

export function getReadingMcqOptionKeys(
  partNumber: number | null,
  options?: Record<string, string>,
): string[] {
  if (partNumber === 3) return [...READING_PART3_MCQ_KEYS];
  return (["A", "B", "C", "D"] as const).filter(k => options?.[k] != null);
}

export function readingMcqOptionsForPart(
  partNumber: number | null,
  options: Record<string, string> | undefined,
): Record<string, string> {
  if (partNumber === 3) return normalizeReadingPart3Options(options);
  return options ?? {};
}

export function readingQuestionPrompt(partNumber: number | null, fallback: string): string {
  if (partNumber === 3) return READING_PART3_QUESTION_INSTRUCTION;
  return fallback;
}
