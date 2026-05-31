/** Session key: where to return from a practice task list (e.g. /dashboard, /practice). */
export const PRACTICE_LIST_RETURN_KEY = "practice_list_return";

/** Session key: filtered list URL to use after results (preserves part filter). */
export const PRACTICE_RESULTS_RETURN_KEY = "celpip_results_return";

export function practiceListPath(pathname: string, search: string): string {
  const q = search.replace(/^\?/, "").trim();
  return q ? `${pathname}?${q}` : pathname;
}

export function buildTaskPracticeHref(
  section: "reading" | "writing" | "speaking" | "listening",
  taskId: string,
  listPath: string,
): string {
  const params = new URLSearchParams({ taskId });
  if (listPath.startsWith("/")) params.set("returnTo", listPath);
  return `/practice/${section}/task?${params.toString()}`;
}

export function readPracticeListReturn(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const stored = sessionStorage.getItem(PRACTICE_LIST_RETURN_KEY);
  return stored?.startsWith("/") ? stored : fallback;
}

export function storeResultsReturn(listPath: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PRACTICE_RESULTS_RETURN_KEY, listPath);
}

export function readResultsReturn(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const stored = sessionStorage.getItem(PRACTICE_RESULTS_RETURN_KEY);
  return stored?.startsWith("/") ? stored : fallback;
}

export function taskReturnHref(
  searchParams: URLSearchParams | { get: (k: string) => string | null },
  sectionFallback: string,
): string {
  const raw = searchParams.get("returnTo");
  if (raw?.startsWith("/")) return raw;
  return sectionFallback;
}
