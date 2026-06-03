/** Per-part payload stored on mock_test_attempts.task_results (key = order number as string). */
export type MockPartResult = {
  taskId: string;
  taskType: string;
  answers: Record<string | number, string>;
  score?: number;
  total?: number;
  studentResponse?: string;
  writingTask2Choice?: "A" | "B";
  writingTask2ChosenLabel?: string;
  transcript?: string;
  feedback?: unknown;
  questions?: unknown[];
  completedAt: string;
};

export type MockTaskResultsMap = Record<string, MockPartResult>;

/** JSON stored on mock_test_attempts.task_results — order keys plus legacy meta fields. */
export type MockTaskResultsStorage = {
  _completed_orders?: number[];
  _status?: string;
  [orderKey: string]: MockPartResult | number[] | string | undefined;
};

export function getPartResult(
  map: MockTaskResultsMap | null | undefined,
  order: number,
): MockPartResult | undefined {
  if (!map) return undefined;
  return map[String(order)];
}

export function scorePartResult(r: MockPartResult): { score: number; total: number } | null {
  if (typeof r.score === "number" && typeof r.total === "number") {
    return { score: r.score, total: r.total };
  }
  return null;
}

export function aggregateMockScores(map: MockTaskResultsMap): {
  score: number;
  total: number;
  parts: { order: number; score: number; total: number }[];
} {
  const parts: { order: number; score: number; total: number }[] = [];
  let score = 0;
  let total = 0;
  for (const [key, r] of Object.entries(map)) {
    const s = scorePartResult(r);
    if (!s) continue;
    const order = Number(key);
    parts.push({ order, ...s });
    score += s.score;
    total += s.total;
  }
  parts.sort((a, b) => a.order - b.order);
  return { score, total, parts };
}
