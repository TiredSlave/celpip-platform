import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/app/lib/supabase-admin";
import {
  countMockTestParts,
  findMockTestsUsingTask,
  unpublishBrokenMockTests,
} from "@/app/lib/admin-task-delete";
import { requireAdmin } from "@/app/lib/mock-test-auth";

type Params = { params: Promise<{ id: string }> };

/** Remove rows that reference admin_tasks.id before deleting the task itself. */
async function deleteTaskDependents(
  admin: ReturnType<typeof createSupabaseAdmin>,
  taskId: string,
): Promise<{ ok: true } | { ok: false; step: string; message: string }> {
  const steps: { step: string; table: string; column: string }[] = [
    { step: "unlink_mock_test", table: "mock_test_tasks", column: "task_id" },
    { step: "user_results", table: "user_results", column: "task_id" },
    { step: "user_vocabulary", table: "user_vocabulary", column: "task_id" },
  ];

  for (const { step, table, column } of steps) {
    const { error } = await admin.from(table).delete().eq(column, taskId);
    if (error) {
      if (error.code === "42P01" || error.code === "42703") continue;
      return { ok: false, step, message: error.message };
    }
  }

  return { ok: true };
}

/** Preview which mock tests use this task (for delete confirmation). */
export async function GET(request: Request, { params }: Params) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id } = await params;
  const admin = createSupabaseAdmin();

  try {
    const mockTests = await findMockTestsUsingTask(admin, id);
    return NextResponse.json({ mockTests });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load mock usage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id } = await params;
  const admin = createSupabaseAdmin();

  let affectedMocks: Awaited<ReturnType<typeof findMockTestsUsingTask>> = [];
  try {
    affectedMocks = await findMockTestsUsingTask(admin, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to check mock usage";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const mockIds = affectedMocks.map(m => m.id);
  const partsBefore = await countMockTestParts(admin, mockIds);

  const deps = await deleteTaskDependents(admin, id);
  if (!deps.ok) {
    console.error("[admin/tasks DELETE] dependents failed:", deps.step, deps.message);
    return NextResponse.json(
      { error: `Could not remove linked ${deps.step} data: ${deps.message}` },
      { status: 500 },
    );
  }

  const unpublishedMocks = await unpublishBrokenMockTests(admin, mockIds, partsBefore);

  const { error: delErr } = await admin.from("admin_tasks").delete().eq("id", id);
  if (delErr) {
    console.error("[admin/tasks DELETE] admin_tasks failed:", delErr);
    const hint =
      delErr.code === "23503"
        ? " This task is still referenced elsewhere in the database."
        : "";
    return NextResponse.json({ error: delErr.message + hint }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    removedFromMocks: affectedMocks.map(m => ({ id: m.id, title: m.title })),
    unpublishedMocks: unpublishedMocks.map(m => ({ id: m.id, title: m.title })),
  });
}
