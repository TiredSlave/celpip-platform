"use client";

import { parseReadingLabeledPassage } from "../../lib/reading-passage-format";
import { VocabularySelectableText } from "../VocabularySelectableText";

type Props = {
  passage: string;
  taskId: string;
};

/** Renders Reading Part 3/4 passages with prominent A–D paragraph headings. */
export function ReadingLabeledPassage({ passage, taskId }: Props) {
  const paragraphs = parseReadingLabeledPassage(passage);

  if (!paragraphs?.length) {
    return (
      <VocabularySelectableText text={passage} source="reading" taskId={taskId} />
    );
  }

  return (
    <div className="space-y-5">
      {paragraphs.map((p, i) => (
        <section key={`${i}-${p.label}`} className="flex gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-lg font-bold text-white shadow-sm"
            aria-hidden
          >
            {p.label}
          </div>
          <div className="min-w-0 flex-1 pt-0.5 text-gray-800 leading-relaxed">
            <VocabularySelectableText text={p.body} source="reading" taskId={taskId} />
          </div>
        </section>
      ))}
    </div>
  );
}
