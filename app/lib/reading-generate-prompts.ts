import {
  READING_PASSAGE_LABEL_FORMAT,
  READING_TASK3_PASSAGE,
  READING_TASK4_PASSAGE,
} from "./reading-passage-constraints";

/** Passage must be one JSON string with \\n only — no raw line breaks inside quotes. */
export const READING_PASSAGE_JSON_RULES = `JSON string rules for "passage":
- The passage value must be ONE JSON string on a single logical line.
- Use \\n for every line break (e.g. "A\\n\\nFirst paragraph.\\n\\nB\\n\\nSecond paragraph.").
- Do NOT put real line breaks inside the quoted passage value.
- Escape any double quote inside the passage as \\".`;

export function buildReadingPart3PassagePrompt(): string {
  return `Generate ONLY the reading passage for CELPIP Reading Part 3 (Reading for Information).

Requirements:
- ${READING_TASK3_PASSAGE.wordCountLabel}; ${READING_TASK3_PASSAGE.paragraphs}; ${READING_TASK3_PASSAGE.style}; ${READING_TASK3_PASSAGE.paragraphLabels}.

${READING_PASSAGE_LABEL_FORMAT}

${READING_PASSAGE_JSON_RULES}

Return ONLY raw JSON:
{
  "reading_type": "Reading for Information",
  "time_limit_minutes": 10,
  "title": "article title",
  "passage": "A\\n\\n[paragraph A]\\n\\nB\\n\\n[paragraph B]\\n\\nC\\n\\n[paragraph C]\\n\\nD\\n\\n[paragraph D]"
}`;
}

export function buildReadingPart3QuestionsPrompt(
  title: string,
  passage: string,
  questionCount: number,
): string {
  return `Generate ONLY the multiple-choice questions for CELPIP Reading Part 3 (Reading for Information).

Title: ${title}

Passage (paragraphs A, B, C, D):
${passage}

CELPIP Part 3 format (follow exactly):
- Generate exactly ${questionCount} questions (ids 1–${questionCount}).
- Each question is a STATEMENT (not a question with a "?"). Example: "The writer describes how local schools adapted their programs."
- Each question has exactly 5 options A, B, C, D, E:
  - A = the information appears in paragraph A
  - B = the information appears in paragraph B
  - C = the information appears in paragraph C
  - D = the information appears in paragraph D
  - E = "Information is not given in any paragraph" (use this exact wording for option E on every question)
- For options A–D use short labels: "Paragraph A", "Paragraph B", "Paragraph C", "Paragraph D".
- Exactly 2 or 3 questions must have correct_answer "E" (the statement is NOT supported by any paragraph).
- The remaining questions must have correct_answer "A", "B", "C", or "D" matching where the information actually appears.
- Do not make every answer E; most answers should be A–D.

Return ONLY raw JSON:
{
  "questions": [
    {
      "id": 1,
      "question": "statement about the passage",
      "options": {
        "A": "Paragraph A",
        "B": "Paragraph B",
        "C": "Paragraph C",
        "D": "Paragraph D",
        "E": "Information is not given in any paragraph"
      },
      "correct_answer": "B",
      "explanation": "Paragraph B discusses …; E would apply only if no paragraph mentions this."
    }
  ]
}`;
}

export function buildReadingPart4PassagePrompt(): string {
  return `Generate ONLY the main article for CELPIP Reading Part 4 (Reading for Viewpoints).

Requirements:
- ${READING_TASK4_PASSAGE.wordCountLabel}; ${READING_TASK4_PASSAGE.paragraphs}; ${READING_TASK4_PASSAGE.style}; ${READING_TASK4_PASSAGE.paragraphLabels}.

${READING_PASSAGE_LABEL_FORMAT}

${READING_PASSAGE_JSON_RULES}

Return ONLY raw JSON:
{
  "reading_type": "Reading for Viewpoints",
  "time_limit_minutes": 13,
  "title": "article title",
  "passage": "A\\n\\n[paragraph A]\\n\\nB\\n\\n[paragraph B]\\n\\nC\\n\\n[paragraph C]\\n\\nD\\n\\n[paragraph D]"
}`;
}

export function buildReadingPart4QuestionsPrompt(
  title: string,
  passage: string,
): string {
  return `Generate the questions and fill-in-blank summary for CELPIP Reading Part 4.

Title: ${title}

Passage:
${passage}

Generate exactly 5 MCQ questions (ids 1–5) about the viewpoints article.
Generate exactly 5 fill-in-blank items (ids 6–10) in a 100–150 word summary with placeholders [BLANK_6] through [BLANK_10].

Fill-in-blank rules:
- At least 2 blanks use single-word options; at least 2 use 3–8 word phrases.
- All four options per blank must be parallel grammar; only one fits the article.

Return ONLY raw JSON:
{
  "questions": [
    {
      "id": 1,
      "question": "question about the viewpoints",
      "options": {"A": "option", "B": "option", "C": "option", "D": "option"},
      "correct_answer": "A",
      "explanation": "which part supports this answer",
      "option_explanations": {"A": "why A", "B": "why B", "C": "why C", "D": "why D"}
    }
  ],
  "fill_in_blank": {
    "instruction": "Complete the summary by filling in the blanks. Select the best choice for each blank from the dropdown.",
    "text_with_blanks": "summary with [BLANK_6] ... [BLANK_10]",
    "blanks": [
      {
        "id": 6,
        "options": {"A": "word or phrase", "B": "word or phrase", "C": "word or phrase", "D": "word or phrase"},
        "correct_answer": "A",
        "explanation": "why this fits",
        "option_explanations": {"A": "why A", "B": "why B", "C": "why C", "D": "why D"}
      }
    ]
  }
}`;
}
