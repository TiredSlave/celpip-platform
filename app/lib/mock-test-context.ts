export type MockTestContext = {
  attemptId: string;
  mockTestId: string;
  order: number;
};

const STORAGE_KEY = "celpip_mock_context";

export function setMockTestContext(ctx: MockTestContext) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
}

export function getMockTestContext(): MockTestContext | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MockTestContext;
  } catch {
    return null;
  }
}

export function clearMockTestContext() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
