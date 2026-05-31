import type { MockPartResult } from "./mock-test-results";

const TIMER_KEY = "celpip_mock_timer";

export type MockTimerState = {
  mockTestId: string;
  attemptId: string;
  order: number;
  deadlineMs: number;
};

export function setMockTimer(state: MockTimerState) {
  sessionStorage.setItem(TIMER_KEY, JSON.stringify(state));
}

export function getMockTimer(): MockTimerState | null {
  try {
    const raw = sessionStorage.getItem(TIMER_KEY);
    return raw ? (JSON.parse(raw) as MockTimerState) : null;
  } catch {
    return null;
  }
}

export function clearMockTimer() {
  sessionStorage.removeItem(TIMER_KEY);
}

export function mockTakeUrl(mockTestId: string, order?: number) {
  const base = `/mock-test/${mockTestId}/take`;
  return order ? `${base}?order=${order}` : base;
}

export function mockResultsUrl(mockTestId: string, attemptId: string) {
  return `/mock-test/${mockTestId}/results?attempt=${attemptId}`;
}

export function mockReviewUrl(mockTestId: string, attemptId: string, order: number) {
  return `/mock-test/${mockTestId}/review?attempt=${attemptId}&order=${order}`;
}

export async function saveMockPartResult(
  mockTestId: string,
  attemptId: string,
  order: number,
  result: MockPartResult,
  token: string,
): Promise<{ ok: boolean; error?: string; attempt?: unknown }> {
  const res = await fetch(`/api/mock-tests/${mockTestId}/attempt`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      attempt_id: attemptId,
      order_number: order,
      result,
      advance: true,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error || res.statusText };
  return { ok: true, attempt: json.attempt };
}

export function practiceUrlWithMock(
  skill: string,
  taskId: string,
  mockTestId: string,
  attemptId: string,
  order: number,
): string {
  const q = new URLSearchParams({
    taskId,
    mockTestId,
    mockAttemptId: attemptId,
    mockOrder: String(order),
  });
  const paths: Record<string, string> = {
    Listening: "/practice/listening/task",
    Reading: "/practice/reading/task",
    Writing: "/practice/writing/task",
    Speaking: "/practice/speaking/task",
  };
  return `${paths[skill] || "/practice"}?${q}`;
}
