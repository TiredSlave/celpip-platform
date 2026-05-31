import type { MockPartResult } from "./mock-test-results";
import { clearMockTimer, getMockTimer, mockTakeUrl, saveMockPartResult } from "./mock-test-runner";

export type MockPracticeParams = {
  mockTestId: string;
  mockAttemptId: string;
  mockOrder: number;
};

export function parseMockPracticeParams(searchParams: URLSearchParams): MockPracticeParams | null {
  const mockTestId = searchParams.get("mockTestId");
  const mockAttemptId = searchParams.get("mockAttemptId");
  const mockOrder = searchParams.get("mockOrder");
  if (!mockTestId || !mockAttemptId || !mockOrder) return null;
  const order = Number(mockOrder);
  if (!Number.isInteger(order) || order < 1) return null;
  return { mockTestId, mockAttemptId, mockOrder: order };
}

/** After finishing a practice task inside a mock, save and return to the runner. */
export async function finishMockPracticePart(
  params: MockPracticeParams,
  result: MockPartResult,
  token: string,
): Promise<{ ok: boolean; error?: string; nextUrl: string }> {
  const saved = await saveMockPartResult(
    params.mockTestId,
    params.mockAttemptId,
    params.mockOrder,
    result,
    token,
  );
  clearMockTimer();
  const nextUrl = mockTakeUrl(params.mockTestId);
  if (!saved.ok) return { ok: false, error: saved.error, nextUrl };
  return { ok: true, nextUrl };
}

export function remainingMockSeconds(): number | null {
  const t = getMockTimer();
  if (!t) return null;
  return Math.max(0, Math.ceil((t.deadlineMs - Date.now()) / 1000));
}
