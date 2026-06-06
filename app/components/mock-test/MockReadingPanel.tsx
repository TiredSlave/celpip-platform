"use client";

import { VocabularySelectableText } from "../VocabularySelectableText";
import { ReadingLabeledPassage } from "../reading/ReadingLabeledPassage";
import { ReadingMcqOptions } from "../reading/ReadingMcqOptions";
import { partNumberFromRow, readingPartLabel } from "../../lib/reading-task-types";
import { readingQuestionPrompt } from "../../lib/reading-part3-questions";

type Question = {
  id: number;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string;
};

type Props = {
  task: {
    id: string;
    task_type: string;
    section?: string | null;
    sequence_number?: number | null;
    content: Record<string, unknown>;
  };
  answers: Record<string | number, string>;
  onAnswer: (id: string | number, value: string) => void;
  readOnly?: boolean;
  showFeedback?: boolean;
};

function optionButtonClass(
  selected: boolean,
  showCorrect: boolean,
  showWrong: boolean,
): string {
  if (showCorrect) return "border-green-600 bg-green-100 text-green-900";
  if (showWrong) return "border-red-500 bg-red-100 text-red-900";
  if (selected) return "border-blue-600 bg-blue-100 text-blue-900";
  return "border-gray-300 bg-white text-gray-800 hover:border-gray-500 hover:bg-gray-50";
}

function optionRadioClass(
  selected: boolean,
  showCorrect: boolean,
  showWrong: boolean,
): string {
  if (showCorrect) return "border-green-600 bg-green-600 text-white";
  if (showWrong) return "border-red-500 bg-red-500 text-white";
  if (selected) return "border-blue-600 bg-blue-600 text-white";
  return "border-gray-400 text-transparent";
}

export default function MockReadingPanel({
  task,
  answers,
  onAnswer,
  readOnly = false,
  showFeedback = false,
}: Props) {
  const rawContent = task?.content;
  if (!rawContent || typeof rawContent !== "object") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-gray-700">
        <p>Reading content could not be loaded for this part.</p>
      </div>
    );
  }

  const content = rawContent as {
    title?: string;
    passage?: string;
    main_message?: { from: string; to: string; subject: string; body: string };
    response_message?: { from: string; to: string; subject: string; body: string };
    html_content?: string;
    viewpoints?: { name: string; role: string; opinion: string }[];
    topic?: string;
    questions?: Question[];
    fill_in_blank?: {
      instruction: string;
      from?: string;
      to?: string;
      subject?: string;
      text_with_blanks: string;
      blanks: { id: number; options: Record<string, string>; correct_answer: string; explanation: string }[];
    };
  };

  const partNum = partNumberFromRow(task);
  const partLabel = partNum ? readingPartLabel(`task ${partNum}`) : task.task_type;

  return (
    <div className="h-full min-h-0 flex overflow-hidden w-full">
      {/* LEFT — Passage (independent scroll) */}
      <div className="w-1/2 min-h-0 border-r border-gray-300 overflow-y-auto bg-white p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{partLabel}</h2>

        {content.main_message && (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
              <p className="text-xs text-gray-600 mb-1">
                From: <span className="text-gray-700">{content.main_message.from}</span>
              </p>
              <p className="text-xs text-gray-600 mb-1">
                To: <span className="text-gray-700">{content.main_message.to}</span>
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Subject: <span className="text-gray-700 font-semibold">{content.main_message.subject}</span>
              </p>
              <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                <VocabularySelectableText text={content.main_message.body} source="reading" taskId={task.id} />
              </div>
            </div>
            {content.response_message && !content.fill_in_blank && (
              <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <p className="text-xs text-gray-600 mb-1">
                  From: <span className="text-gray-700">{content.response_message.from}</span>
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  To: <span className="text-gray-700">{content.response_message.to}</span>
                </p>
                <p className="text-xs text-gray-600 mb-3">
                  Subject:{" "}
                  <span className="text-gray-700 font-semibold">{content.response_message.subject}</span>
                </p>
                <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                  <VocabularySelectableText
                    text={content.response_message.body}
                    source="reading"
                    taskId={task.id}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {content.response_message && !content.main_message && (
          <div className="border border-gray-200 rounded-lg p-5 bg-gray-50 mb-4">
            <p className="text-xs text-gray-600 mb-1">
              From: <span className="text-gray-700">{content.response_message.from}</span>
            </p>
            <p className="text-xs text-gray-600 mb-1">
              To: <span className="text-gray-700">{content.response_message.to}</span>
            </p>
            <p className="text-xs text-gray-600 mb-3">
              Subject: <span className="text-gray-700 font-semibold">{content.response_message.subject}</span>
            </p>
            <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
              <VocabularySelectableText text={content.response_message.body} source="reading" taskId={task.id} />
            </div>
          </div>
        )}

        {content.html_content && (
          <div
            className="border border-gray-200 rounded-lg overflow-auto bg-white p-4 text-sm reading-html-content"
            style={{ color: "#1a1a1a" }}
            dangerouslySetInnerHTML={{ __html: content.html_content }}
          />
        )}

        {content.passage && (
          <div className="text-gray-800 text-sm leading-relaxed">
            <h3 className="font-bold text-gray-900 text-base mb-3">{content.title}</h3>
            {(() => {
              const part = partNumberFromRow(task);
              if (part === 3 || part === 4) {
                return (
                  <ReadingLabeledPassage
                    passage={String(content.passage)}
                    taskId={task.id}
                  />
                );
              }
              return (
                <div className="whitespace-pre-wrap">
                  <VocabularySelectableText
                    text={String(content.passage)}
                    source="reading"
                    taskId={task.id}
                  />
                </div>
              );
            })()}
          </div>
        )}

        {content.viewpoints && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Topic: {content.topic}</p>
            {content.viewpoints.map((v, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-bold text-gray-800 mb-1">
                  {v.name} — <span className="font-normal text-gray-600">{v.role}</span>
                </p>
                <div className="text-sm text-gray-700 leading-relaxed">
                  <VocabularySelectableText text={v.opinion} source="reading" taskId={task.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT — Questions (independent scroll) */}
      <div className="w-1/2 min-h-0 overflow-y-auto bg-gray-50 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {readingQuestionPrompt(
            partNum,
            "Choose the best option according to the information given in the message:",
          )}
        </h2>
        <div className="space-y-8">
          {content.questions?.map((q, i) => (
            <div key={`${q.id}-${i}`}>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                {i + 1}. {q.question}
              </p>
              <ReadingMcqOptions
                question={q}
                partNumber={partNum}
                selected={answers[q.id] as string | undefined}
                onSelect={opt => onAnswer(q.id, opt)}
                readOnly={readOnly}
                showFeedback={showFeedback}
                optionButtonClass={optionButtonClass}
                optionRadioClass={optionRadioClass}
              />
              {showFeedback && (
                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-xs text-yellow-900">
                  💡 {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        {content.fill_in_blank && (
          <div className="mt-8 border-t-2 border-gray-300 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">{content.fill_in_blank.instruction}</h3>
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-800 leading-loose">
              {content.fill_in_blank.text_with_blanks.split(/(\[BLANK_\d+\])/).map((part, idx) => {
                const match = part.match(/\[BLANK_(\d+)\]/);
                if (!match) return <span key={idx}>{part}</span>;
                const blankId = parseInt(match[1], 10);
                const blank = content.fill_in_blank!.blanks.find(b => b.id === blankId);
                if (!blank) return <span key={idx}>{part}</span>;
                return (
                  <select
                    key={idx}
                    value={answers[blankId] || ""}
                    disabled={readOnly}
                    onChange={e => onAnswer(blankId, e.target.value)}
                    className="mx-1 px-2 py-1 border-2 border-gray-400 rounded text-sm font-medium text-gray-900 bg-white"
                  >
                    <option value="">—</option>
                    {Object.entries(blank.options).map(([k, v]) => (
                      <option key={`${blankId}-${k}`} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
