import { supabase as defaultSupabase } from "./supabase";
import {
  isReadingAdminTask,
  matchesReadingPracticeFilter,
  READING_TASK_TYPE_KEYS,
  type ReadingFilter,
  type ReadingTaskRow,
} from "./reading-task-types";

export type ReadingPracticeTask = ReadingTaskRow & {
  id: string;
  title?: string;
  content?: unknown;
  created_at: string;
};

type SupabaseClient = typeof defaultSupabase;

/** Tasks for the reading practice library, oldest → newest. */
export async function fetchReadingPracticeTasks(
  active: ReadingFilter,
  client: SupabaseClient = defaultSupabase,
): Promise<ReadingPracticeTask[]> {
  const byKeys = await client
    .from("admin_tasks")
    .select("id, task_type, section, sequence_number, title, content, created_at")
    .in("task_type", [...READING_TASK_TYPE_KEYS])
    .order("created_at", { ascending: true });

  if (byKeys.error) throw new Error(byKeys.error.message);

  const bySection = await client
    .from("admin_tasks")
    .select("id, task_type, section, sequence_number, title, content, created_at")
    .eq("section", "Reading")
    .order("created_at", { ascending: true });

  if (bySection.error) throw new Error(bySection.error.message);

  const byLabel = await client
    .from("admin_tasks")
    .select("id, task_type, section, sequence_number, title, content, created_at")
    .ilike("task_type", "Reading task%")
    .order("created_at", { ascending: true });

  if (byLabel.error) throw new Error(byLabel.error.message);

  const merged = new Map<string, ReadingPracticeTask>();
  for (const row of [...(byKeys.data || []), ...(bySection.data || []), ...(byLabel.data || [])]) {
    merged.set(row.id, row as ReadingPracticeTask);
  }

  const pool = [...merged.values()].filter(t => isReadingAdminTask(t));
  return pool
    .filter(t => matchesReadingPracticeFilter(t, active))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
