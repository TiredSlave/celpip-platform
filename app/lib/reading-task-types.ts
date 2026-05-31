/**
 * Reading rows in admin_tasks:
 *   task_type: "task 1" … "task 4" OR "Reading task 1" … (your DB)
 *   section: "Reading"
 *   sequence_number: 1–4
 */

export const READING_TASK_TYPE_KEYS = ["task 1", "task 2", "task 3", "task 4"] as const;

export type ReadingTaskTypeKey = (typeof READING_TASK_TYPE_KEYS)[number];

export type ReadingFilter = "all" | ReadingTaskTypeKey;

export const READING_PARTS = [
  { key: "task 1" as const, partNumber: 1, label: "Part 1", title: "Correspondence", aiReadingType: "Reading Correspondence", instruction: "Read the following message", timeMinutes: 11, questionCount: 11 },
  { key: "task 2" as const, partNumber: 2, label: "Part 2", title: "Apply Information", aiReadingType: "Reading to Apply Information", instruction: "Read the following information", timeMinutes: 9, questionCount: 8 },
  { key: "task 3" as const, partNumber: 3, label: "Part 3", title: "Reading for Information", aiReadingType: "Reading for Information", instruction: "Read the following passage", timeMinutes: 10, questionCount: 9 },
  { key: "task 4" as const, partNumber: 4, label: "Part 4", title: "Viewpoints", aiReadingType: "Reading for Viewpoints", instruction: "Read the following viewpoints", timeMinutes: 13, questionCount: 10 },
] as const;

export type ReadingTaskRow = {
  task_type?: string | null;
  section?: string | null;
  sequence_number?: number | null;
};

const partByNumber = Object.fromEntries(READING_PARTS.map(p => [p.partNumber, p]));

export function readingPartFilterLabel(part: (typeof READING_PARTS)[number]): string {
  return `${part.label} — ${part.title}`;
}

export function normalizeTaskTypeValue(value: string): string {
  return value
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isSpeakingWritingOrListening(taskType: string): boolean {
  const n = normalizeTaskTypeValue(taskType);
  return (
    n.startsWith("speaking ") ||
    n.startsWith("writing ") ||
    n.startsWith("listening")
  );
}

function isWritingTaskType(taskType: string): boolean {
  return normalizeTaskTypeValue(taskType).startsWith("writing ");
}

function isListeningTaskType(taskType: string): boolean {
  return normalizeTaskTypeValue(taskType).startsWith("listening");
}

/** AI / legacy labels from admin dropdown (Task 1: Correspondence, etc.) */
function readingPartFromLegacyLabel(taskType: string): number | null {
  const n = normalizeTaskTypeValue(taskType);

  const taskColon = n.match(/^task\s*(\d)\s*:/);
  if (taskColon) {
    const num = Number(taskColon[1]);
    return num >= 1 && num <= 4 ? num : null;
  }

  const partDash = n.match(/^part\s*(\d)\s*[—\-:]/);
  if (partDash) {
    const num = Number(partDash[1]);
    return num >= 1 && num <= 4 ? num : null;
  }

  if (n.startsWith("reading ")) {
    if (n.includes("correspondence")) return 1;
    if (n.includes("apply information")) return 2;
    if (n.includes("for information")) return 3;
    if (n.includes("viewpoints")) return 4;
  }

  return null;
}

/** Part number from a READING task_type only (never from "Speaking Task 4"). */
export function readingOnlyPartNumber(taskType: string | null | undefined): number | null {
  if (!taskType || isSpeakingWritingOrListening(taskType)) return null;

  const n = normalizeTaskTypeValue(taskType);

  for (const part of READING_PARTS) {
    if (n === normalizeTaskTypeValue(part.key)) return part.partNumber;
  }

  const readingTask = n.match(/^reading\s+task\s*(\d)$/);
  if (readingTask) {
    const num = Number(readingTask[1]);
    return num >= 1 && num <= 4 ? num : null;
  }

  const taskOnly = n.match(/^task\s*(\d)$/);
  if (taskOnly) {
    const num = Number(taskOnly[1]);
    return num >= 1 && num <= 4 ? num : null;
  }

  const partOnly = n.match(/^part\s*(\d)(?:\s|$)/);
  if (partOnly) {
    const num = Number(partOnly[1]);
    return num >= 1 && num <= 4 ? num : null;
  }

  return readingPartFromLegacyLabel(taskType);
}

export function partNumberFromRow(row: ReadingTaskRow): number | null {
  const fromType = readingOnlyPartNumber(row.task_type);
  if (fromType !== null) return fromType;
  if (
    row.section?.trim().toLowerCase() === "reading" &&
    typeof row.sequence_number === "number" &&
    row.sequence_number >= 1 &&
    row.sequence_number <= 4
  ) {
    return row.sequence_number;
  }
  return null;
}

export function partNumberFromFilter(filter: ReadingFilter): number | null {
  if (filter === "all") return null;
  return readingOnlyPartNumber(filter);
}

export function isReadingAdminTask(row: ReadingTaskRow): boolean {
  const tt = (row.task_type || "").trim();
  if (!tt) {
    return row.section?.trim().toLowerCase() === "reading";
  }

  if (isSpeakingWritingOrListening(tt)) return false;
  if (isWritingTaskType(tt)) return false;
  if (isListeningTaskType(tt)) return false;

  if (readingOnlyPartNumber(tt) !== null) return true;
  if (READING_TASK_TYPE_KEYS.some(k => taskTypesEqual(tt, k))) return true;
  if (normalizeTaskTypeValue(tt).startsWith("reading ")) return true;

  return false;
}

export function matchesReadingPracticeFilter(
  row: ReadingTaskRow,
  filter: ReadingFilter,
): boolean {
  if (!isReadingAdminTask(row)) return false;
  if (filter === "all") return true;
  if (taskTypesEqual(row.task_type || "", filter)) return true;
  const rowPart = partNumberFromRow(row);
  const filterPart = partNumberFromFilter(filter);
  return rowPart !== null && filterPart !== null && rowPart === filterPart;
}

export function taskTypesEqual(a: string, b: string): boolean {
  return normalizeTaskTypeValue(a) === normalizeTaskTypeValue(b);
}

export function resolveReadingFilter(raw: string | null): ReadingFilter {
  if (!raw || raw === "all") return "all";
  const trimmed = decodeURIComponent(raw).trim();
  for (const key of READING_TASK_TYPE_KEYS) {
    if (taskTypesEqual(trimmed, key)) return key;
  }
  const num = readingOnlyPartNumber(trimmed);
  if (num && partByNumber[num]) return partByNumber[num].key;
  return "all";
}

export function readingPartLabel(taskType: string): string {
  const num = readingOnlyPartNumber(taskType);
  if (num && partByNumber[num]) return readingPartFilterLabel(partByNumber[num]);
  if (isReadingAdminTask({ task_type: taskType })) return taskType;
  return taskType;
}

export function readingTypeForGenerate(taskType: string): string {
  const num = readingOnlyPartNumber(taskType);
  if (num && partByNumber[num]) return partByNumber[num].aiReadingType;
  return taskType;
}

export function isReadingTaskType(taskType: string): boolean {
  return isReadingAdminTask({ task_type: taskType });
}

/** Section stored on admin_tasks — derived from task_type, not the last module clicked in the UI. */
export function inferAdminTaskSection(taskType: string): string {
  const tt = taskType.trim();
  if (!tt) return "Writing";
  if (isListeningTaskType(tt)) return "Listening";
  if (normalizeTaskTypeValue(tt).startsWith("speaking")) return "Speaking";
  if (isWritingTaskType(tt)) return "Writing";
  if (isReadingAdminTask({ task_type: tt })) return "Reading";
  return "Writing";
}

/** Admin list: only 5 filters — all | Writing | Reading | Speaking | Listening */
export function matchesAdminTasksFilter(
  row: ReadingTaskRow & { task_type: string },
  filter: string,
): boolean {
  if (filter === "all") return true;
  const tt = row.task_type || "";
  if (filter === "Reading") return isReadingAdminTask(row);
  if (filter === "Writing") return isWritingTaskType(tt);
  if (filter === "Speaking") return normalizeTaskTypeValue(tt).startsWith("speaking");
  if (filter === "Listening") return isListeningTaskType(tt);
  return false;
}

/** Load all reading rows for practice/admin (broad query + narrow filter). */
export function rowMatchesReadingTypes(row: ReadingTaskRow): boolean {
  return isReadingAdminTask(row);
}
