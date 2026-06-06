"use client";

import {
  getReadingMcqOptionKeys,
  readingMcqOptionsForPart,
} from "../../lib/reading-part3-questions";

type Props = {
  question: {
    id: number;
    options: Record<string, string>;
    correct_answer: string;
    explanation?: string;
  };
  partNumber: number | null;
  selected: string | undefined;
  onSelect: (optionKey: string) => void;
  readOnly?: boolean;
  showFeedback?: boolean;
  optionButtonClass: (selected: boolean, showCorrect: boolean, showWrong: boolean) => string;
  optionRadioClass: (selected: boolean, showCorrect: boolean, showWrong: boolean) => string;
};

export function ReadingMcqOptions({
  question,
  partNumber,
  selected,
  onSelect,
  readOnly = false,
  showFeedback = false,
  optionButtonClass,
  optionRadioClass,
}: Props) {
  const options = readingMcqOptionsForPart(partNumber, question.options);
  const keys = getReadingMcqOptionKeys(partNumber, options);

  return (
    <div className="space-y-2">
      {keys.map(opt => {
        const isSelected = selected === opt;
        const showCorrect = showFeedback && opt === question.correct_answer;
        const showWrong = showFeedback && isSelected && !showCorrect;
        return (
          <button
            key={`${question.id}-${opt}`}
            type="button"
            disabled={readOnly}
            onClick={() => onSelect(opt)}
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition flex items-center gap-3 ${optionButtonClass(
              isSelected,
              showCorrect,
              showWrong,
            )}`}
          >
            <span
              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold ${optionRadioClass(
                isSelected,
                showCorrect,
                showWrong,
              )}`}
            >
              {showCorrect ? "✓" : showWrong ? "✗" : isSelected ? opt : ""}
            </span>
            <span>
              {opt}. {options[opt]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
