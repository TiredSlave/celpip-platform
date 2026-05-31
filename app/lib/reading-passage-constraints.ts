/**
 * Official-style length and structure targets for CELPIP Reading passages (admin generation).
 */

export const READING_TASK1_PASSAGE = {
  wordCountMin: 150,
  wordCountMax: 250,
  wordCountLabel: "about 150–250 words",
  format: "short email, letter, or memo",
  paragraphs: "typically 2–4 short paragraphs (no fixed paragraph count)",
} as const;

export const READING_TASK3_PASSAGE = {
  wordCountMin: 300,
  wordCountMax: 450,
  wordCountLabel: "about 300–450 words",
  paragraphs: "exactly 4 paragraphs",
  style: "informational article or report",
  paragraphLabels:
    'each paragraph headed with an obvious letter on its own line: "A", then "B", then "C", then "D" (CELPIP exam style)',
} as const;

export const READING_TASK4_PASSAGE = {
  wordCountMin: 350,
  wordCountMax: 500,
  wordCountLabel: "about 350–500 words",
  paragraphs: "exactly 4 paragraphs",
  style:
    "opinion or argument style, with a clear position and a substantive counterargument",
  paragraphLabels:
    'each paragraph headed with an obvious letter on its own line: "A", then "B", then "C", then "D" (CELPIP exam style)',
} as const;

/** How the model should format the passage string (shown to learners with line breaks). */
export const READING_PASSAGE_LABEL_FORMAT = `Structure the passage with four labeled sections A, B, C, D. Each label on its own line, blank line, then that paragraph's text, then repeat for B, C, D.`;
