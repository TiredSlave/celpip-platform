import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { buildTaskPracticeHref } from "./practice-navigation";
import { fetchReadingPracticeTasks } from "./reading-practice-tasks";
import {
  partNumberFromRow,
  READING_PARTS,
  type ReadingTaskRow,
} from "./reading-task-types";
import { supabase as defaultSupabase } from "./supabase";

export type PracticeSection = "reading" | "writing" | "speaking" | "listening";

export type PracticeTaskTypeOption = {
  menuLabel: string;
  subtitle?: string;
  href: string;
  taskType?: string;
  readingPartKey?: string;
};

export type TaskSiblings = {
  prevId: string | null;
  nextId: string | null;
  position: number;
  total: number;
};

type SupabaseClient = typeof defaultSupabase;

const EMPTY_SIBLINGS: TaskSiblings = {
  prevId: null,
  nextId: null,
  position: 0,
  total: 0,
};

const SPEAKING_TASK_TYPES = [
  "Speaking Task 1",
  "Speaking Task 2",
  "Speaking Task 3",
  "Speaking Task 4",
  "Speaking Task 5",
  "Speaking Task 6",
  "Speaking Task 7",
  "Speaking Task 8",
] as const;

const WRITING_TASK_TYPES = [
  { taskType: "Writing Task 1", label: "Task 1", title: "Writing an Email" },
  { taskType: "Writing Task 2", label: "Task 2", title: "Responding to Survey Questions" },
] as const;

const LISTENING_TASK_TYPES = [
  { taskType: "Listening - Problem Solving", label: "Task 1", title: "Problem Solving" },
  { taskType: "Listening - Daily Life Conversation", label: "Task 2", title: "Daily Life Conversation" },
  { taskType: "Listening - Listening for Information", label: "Task 3", title: "Listening for Information" },
  { taskType: "Listening - News Item", label: "Task 4", title: "News Item" },
  { taskType: "Listening - Discussion", label: "Task 5", title: "Discussion" },
  { taskType: "Listening - Viewpoints", label: "Task 6", title: "Viewpoints" },
] as const;

/** Task-type choices for the practice header dropdown (same section only). */
export function getPracticeTaskTypeOptions(section: PracticeSection): PracticeTaskTypeOption[] {
  switch (section) {
    case "reading":
      return READING_PARTS.map(part => ({
        menuLabel: `${part.label} — ${part.title}`,
        subtitle: part.instruction,
        href: `/practice/reading?filter=${encodeURIComponent(part.key)}`,
        readingPartKey: part.key,
      }));
    case "writing":
      return WRITING_TASK_TYPES.map(part => ({
        menuLabel: `${part.label} — ${part.title}`,
        href: practiceTaskTypeListHref("writing", part.taskType),
        taskType: part.taskType,
      }));
    case "speaking":
      return SPEAKING_TASK_TYPES.map(taskType => ({
        menuLabel: taskType.replace("Speaking ", ""),
        href: practiceTaskTypeListHref("speaking", taskType),
        taskType,
      }));
    case "listening":
      return LISTENING_TASK_TYPES.map(part => ({
        menuLabel: `${part.label} — ${part.title}`,
        href: practiceTaskTypeListHref("listening", part.taskType),
        taskType: part.taskType,
      }));
  }
}

export function isPracticeTaskTypeActive(
  section: PracticeSection,
  option: PracticeTaskTypeOption,
  currentTaskType: string | undefined,
  row?: ReadingTaskRow,
): boolean {
  if (section === "reading") {
    if (!option.readingPartKey) return false;
    const partNum = partNumberFromRow(row ?? { task_type: currentTaskType ?? "" });
    const part = partNum ? READING_PARTS.find(p => p.partNumber === partNum) : null;
    return part?.key === option.readingPartKey;
  }
  if (!currentTaskType?.trim() || !option.taskType) return false;
  return currentTaskType.trim() === option.taskType;
}

/** Filtered practice library URL for a task type (matches list-page filters). */
export function practiceTaskTypeListHref(
  section: PracticeSection,
  taskType: string,
  row?: ReadingTaskRow,
): string {
  if (section === "reading") {
    const partNum = partNumberFromRow(row ?? { task_type: taskType });
    const part = partNum ? READING_PARTS.find(p => p.partNumber === partNum) : null;
    if (part) {
      return `/practice/reading?filter=${encodeURIComponent(part.key)}`;
    }
    return "/practice/reading";
  }

  const base = `/practice/${section}`;
  if (!taskType.trim()) return base;
  return `${base}?filter=${encodeURIComponent(taskType.trim())}`;
}

function siblingsFromOrderedIds(ids: string[], currentTaskId: string): TaskSiblings {
  const index = ids.indexOf(currentTaskId);
  if (index < 0) return EMPTY_SIBLINGS;
  return {
    prevId: index > 0 ? ids[index - 1] : null,
    nextId: index < ids.length - 1 ? ids[index + 1] : null,
    position: index + 1,
    total: ids.length,
  };
}

/** Previous / next tasks of the same type in admin_tasks (created_at ascending). */
export async function fetchPracticeTaskSiblings(
  section: PracticeSection,
  currentTaskId: string,
  taskType: string,
  row?: ReadingTaskRow,
  client: SupabaseClient = defaultSupabase,
): Promise<TaskSiblings> {
  if (!currentTaskId || !taskType.trim()) return EMPTY_SIBLINGS;

  if (section === "reading") {
    const partNum = partNumberFromRow(row ?? { task_type: taskType });
    const part = partNum ? READING_PARTS.find(p => p.partNumber === partNum) : null;
    if (!part) return EMPTY_SIBLINGS;
    const tasks = await fetchReadingPracticeTasks(part.key, client);
    return siblingsFromOrderedIds(
      tasks.map(t => t.id),
      currentTaskId,
    );
  }

  const { data, error } = await client
    .from("admin_tasks")
    .select("id, created_at")
    .eq("task_type", taskType.trim())
    .order("created_at", { ascending: true });

  if (error || !data?.length) return EMPTY_SIBLINGS;
  return siblingsFromOrderedIds(
    data.map(t => t.id),
    currentTaskId,
  );
}

export function navigatePracticeTask(
  router: AppRouterInstance,
  section: PracticeSection,
  targetTaskId: string,
  listReturnHref: string,
) {
  router.push(buildTaskPracticeHref(section, targetTaskId, listReturnHref));
}
