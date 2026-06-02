"use client";

type WritingContent = {
  scenario?: string;
  instructions?: string;
  bullet_points?: string[];
  topic?: string;
  context?: string;
  question?: string;
  option_a?: string;
  option_b?: string;
  opinion_options?: string[];
  word_limit?: number;
};

type Props = {
  task: {
    id: string;
    task_type: string;
    content: Record<string, unknown>;
  };
  response: string;
  onResponse: (text: string) => void;
  task2Choice: "A" | "B" | null;
  onTask2Choice: (c: "A" | "B") => void;
  readOnly?: boolean;
};

function writingContent(raw: Record<string, unknown>): WritingContent {
  const str = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : undefined);
  const strList = (key: string) =>
    Array.isArray(raw[key]) ?
      (raw[key] as unknown[]).filter((x): x is string => typeof x === "string")
    : undefined;
  return {
    scenario: str("scenario"),
    instructions: str("instructions"),
    bullet_points: strList("bullet_points"),
    topic: str("topic"),
    context: str("context"),
    question: str("question"),
    option_a: str("option_a"),
    option_b: str("option_b"),
    opinion_options: strList("opinion_options"),
    word_limit: typeof raw.word_limit === "number" ? raw.word_limit : undefined,
  };
}
export default function MockWritingPanel({
  task,
  response,
  onResponse,
  task2Choice,
  onTask2Choice,
  readOnly = false,
}: Props) {
  const c = writingContent(task.content);
  const isTask2 = task.task_type === "Writing Task 2";
  const optA = c.option_a ?? c.opinion_options?.[0];
  const optB = c.option_b ?? c.opinion_options?.[1];
  const wordCount = response.trim() === "" ? 0 : response.trim().split(/\s+/).length;
  const limit = c.word_limit || 200;

  return (
    <div className="h-full min-h-0 flex overflow-hidden w-full">
      <div className="w-1/2 min-h-0 border-r border-gray-300 overflow-y-auto bg-white p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{task.task_type}</h2>
        {isTask2 ? (
          <div className="space-y-4 text-sm text-gray-800">
            {c.topic && <p className="font-semibold">{c.topic}</p>}
            {c.context && <p className="whitespace-pre-wrap">{c.context}</p>}
            {c.question && <p>{c.question}</p>}
            {!readOnly && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-gray-600 uppercase">Select your option</p>
                {optA && (
                  <button
                    type="button"
                    onClick={() => onTask2Choice("A")}
                    className={`w-full text-left p-3 rounded-lg border ${
                      task2Choice === "A" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    <strong>A.</strong> {optA}
                  </button>
                )}
                {optB && (
                  <button
                    type="button"
                    onClick={() => onTask2Choice("B")}
                    className={`w-full text-left p-3 rounded-lg border ${
                      task2Choice === "B" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    <strong>B.</strong> {optB}
                  </button>
                )}
              </div>
            )}
            {readOnly && task2Choice && (
              <p className="text-sm font-medium text-blue-700">Selected: Option {task2Choice}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-800">
            {c.scenario && <p className="whitespace-pre-wrap">{c.scenario}</p>}
            {c.instructions && <p>{c.instructions}</p>}
            {c.bullet_points && (
              <ul className="list-disc pl-5 space-y-1">
                {c.bullet_points.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="w-1/2 min-h-0 flex flex-col overflow-hidden bg-gray-50 p-6 sm:p-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-900">Your response</h3>
          <span className={`text-sm ${wordCount > limit ? "text-red-600" : "text-gray-600"}`}>
            {wordCount} / {limit} words
          </span>
        </div>
        <textarea
          value={response}
          onChange={e => onResponse(e.target.value)}
          readOnly={readOnly}
          className="flex-1 w-full border border-gray-300 rounded-xl p-4 text-sm text-gray-800 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Type your answer here…"
        />
      </div>
    </div>
  );
}
