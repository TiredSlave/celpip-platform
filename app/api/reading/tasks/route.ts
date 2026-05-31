import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../../lib/supabase-admin";
import {
  READING_TASK_TYPE_KEYS,
  partNumberFromFilter,
  resolveReadingFilter,
  type ReadingFilter,
  type ReadingTaskTypeKey,
} from "../../../lib/reading-task-types";

export type ReadingTaskListItem = {
  id: string;
  task_type: string;
  section: string | null;
  sequence_number: number | null;
  title: string | null;
  content: unknown;
  created_at: string;
};

const COLUMNS =
  "id, task_type, section, sequence_number, title, content, created_at";

/**
 * GET /api/reading/tasks
 *
 * Query params (DB fields only — NOT readingType):
 *   filter = all | task 1 | task 2 | task 3 | task 4
 *   taskId = uuid (single task)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const filter: ReadingFilter = resolveReadingFilter(searchParams.get("filter"));
    const order = (searchParams.get("order") || "asc").toLowerCase();
    const ascending = order !== "desc";
    const supabase = createSupabaseAdmin();

    if (taskId) {
      const { data, error } = await supabase
        .from("admin_tasks")
        .select(COLUMNS)
        .eq("id", taskId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      return NextResponse.json({ filter: "all", tasks: [data], count: 1 });
    }

    let tasks: ReadingTaskListItem[] = [];

    if (filter === "all") {
      const { data: byType, error: e1 } = await supabase
        .from("admin_tasks")
        .select(COLUMNS)
        .in("task_type", [...READING_TASK_TYPE_KEYS])
        .order("created_at", { ascending });

      if (e1) {
        return NextResponse.json({ error: e1.message }, { status: 500 });
      }

      const { data: bySection, error: e2 } = await supabase
        .from("admin_tasks")
        .select(COLUMNS)
        .eq("section", "Reading")
        .order("created_at", { ascending });

      if (e2) {
        return NextResponse.json({ error: e2.message }, { status: 500 });
      }

      const byId = new Map<string, ReadingTaskListItem>();
      for (const row of [...(byType || []), ...(bySection || [])]) {
        byId.set(row.id, row);
      }
      tasks = [...byId.values()];
    } else {
      tasks = await loadTasksForPart(supabase, filter, ascending);
    }

    return NextResponse.json({
      filter,
      tasks,
      count: tasks.length,
      order: ascending ? "asc" : "desc",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load reading tasks" },
      { status: 500 },
    );
  }
}

async function loadTasksForPart(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  filter: ReadingTaskTypeKey,
  ascending: boolean,
): Promise<ReadingTaskListItem[]> {
  // 1) Exact match on admin_tasks.task_type (e.g. "task 1")
  const { data: exact, error: exactErr } = await supabase
    .from("admin_tasks")
    .select(COLUMNS)
    .eq("task_type", filter)
    .order("created_at", { ascending });

  if (exactErr) {
    throw new Error(exactErr.message);
  }
  if (exact?.length) {
    return exact;
  }

  // 2) Fallback: section Reading + sequence_number (1–4)
  const partNum = partNumberFromFilter(filter);
  if (partNum !== null) {
    const { data: bySeq, error: seqErr } = await supabase
      .from("admin_tasks")
      .select(COLUMNS)
      .eq("section", "Reading")
      .eq("sequence_number", partNum)
      .order("created_at", { ascending });

    if (seqErr) {
      throw new Error(seqErr.message);
    }
    if (bySeq?.length) {
      return bySeq;
    }
  }

  return [];
}
