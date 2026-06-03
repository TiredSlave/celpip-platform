import { NextResponse } from "next/server";
import { getAdminDataClient } from "../../../../lib/supabase-admin";
import { requireAdmin } from "../../../../lib/mock-test-auth";
import { MOCK_TEST_SKILLS, type MockTestSkill } from "../../../../lib/mock-test-types";
import { buildMockTestTaskRows, validateMockTestTaskIds } from "../../../../lib/mock-test-validate";

type Params = { params: Promise<{ id: string }> };

type PatchBody = {
  title?: string;
  description?: string | null;
  time_limit_minutes?: number;
  task_ids?: string[];
};

export async function GET(request: Request, { params }: Params) {
  const gate = await requireAdmin(request);
  if ("error" in gate) return gate.error;

  const { id } = await params;
  const db = getAdminDataClient(gate);

  const { data: test, error } = await db
    .from("mock_tests")
    .select("*, mock_test_tasks(id, task_id, order_number, section, admin_tasks(id, task_type, title))")
    .eq("id", id)
    .single();

  if (error || !test) {
    return NextResponse.json({ error: "Mock test not found." }, { status: 404 });
  }

  const tasks = (test.mock_test_tasks || []).sort(
    (a: { order_number: number }, b: { order_number: number }) => a.order_number - b.order_number,
  );

  return NextResponse.json({ test: { ...test, mock_test_tasks: tasks } });
}

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireAdmin(request);
  if ("error" in gate) return gate.error;

  const { id } = await params;
  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getAdminDataClient(gate);

  const { data: existing, error: fetchErr } = await db
    .from("mock_tests")
    .select("id, test_type, title")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Mock test not found." }, { status: 404 });
  }

  const testType = existing.test_type as MockTestSkill | null;
  if (!testType || !MOCK_TEST_SKILLS.includes(testType)) {
    return NextResponse.json(
      { error: "This mock has no test_type. Set it in Supabase or recreate the mock." },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
    }
    updates.title = title;
  }

  if (body.description !== undefined) {
    updates.description = body.description?.trim() || null;
  }

  if (body.time_limit_minutes !== undefined) {
    const minutes = Number(body.time_limit_minutes);
    if (!Number.isFinite(minutes) || minutes < 1) {
      return NextResponse.json({ error: "Invalid time limit." }, { status: 400 });
    }
    updates.time_limit_minutes = minutes;
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateErr } = await db.from("mock_tests").update(updates).eq("id", id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  }

  if (body.task_ids !== undefined) {
    const taskIds = body.task_ids;
    const validation = await validateMockTestTaskIds(db, testType, taskIds, {
      excludeMockTestId: id,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const resolvedTaskIds = validation.taskIds;

    const { error: deleteErr } = await db.from("mock_test_tasks").delete().eq("mock_test_id", id);
    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    const rows = buildMockTestTaskRows(id, testType, resolvedTaskIds);
    const { error: linkErr } = await db.from("mock_test_tasks").insert(rows);
    if (linkErr) {
      const msg =
        linkErr.code === "23505"
          ? "One or more tasks are already used in another mock test."
          : linkErr.message;
      return NextResponse.json({ error: msg }, { status: 409 });
    }
  }

  const { data: updated } = await db
    .from("mock_tests")
    .select("*, mock_test_tasks(id, task_id, order_number, section, admin_tasks(id, task_type, title))")
    .eq("id", id)
    .single();

  return NextResponse.json({ test: updated });
}
