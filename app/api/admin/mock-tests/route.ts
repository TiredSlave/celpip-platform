import { NextResponse } from "next/server";
import { getAdminDataClient } from "../../../lib/supabase-admin";
import { requireAdmin } from "../../../lib/mock-test-auth";
import { MOCK_TEST_SKILLS, type MockTestSkill } from "../../../lib/mock-test-types";
import { buildMockTestTaskRows, validateMockTestTaskIds } from "../../../lib/mock-test-validate";

type CreateBody = {
  title: string;
  description?: string;
  test_type: MockTestSkill;
  time_limit_minutes?: number;
  task_ids: string[];
};

export async function GET(request: Request) {
  const gate = await requireAdmin(request);
  if ("error" in gate) return gate.error;

  const { searchParams } = new URL(request.url);
  const order = (searchParams.get("order") || "asc").toLowerCase();
  const ascending = order !== "desc";

  const db = getAdminDataClient(gate);
  const { data: tests, error } = await db
    .from("mock_tests")
    .select("*, mock_test_tasks(id, task_id, order_number, section)")
    .order("created_at", { ascending });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: assigned } = await db.from("mock_test_tasks").select("task_id");
  const assignedTaskIds = (assigned || []).map(r => r.task_id);

  return NextResponse.json({ tests: tests || [], assignedTaskIds, order: ascending ? "asc" : "desc" });
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request);
  if ("error" in gate) return gate.error;

  let body: CreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = body.title?.trim();
  const testType = body.test_type;
  const taskIds = body.task_ids || [];

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!MOCK_TEST_SKILLS.includes(testType)) {
    return NextResponse.json({ error: "Invalid test_type." }, { status: 400 });
  }

  const db = getAdminDataClient(gate);

  const validation = await validateMockTestTaskIds(db, testType, taskIds);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }
  const resolvedTaskIds = validation.taskIds;

  const { data: inserted, error: insertErr } = await db
    .from("mock_tests")
    .insert({
      title,
      description: body.description?.trim() || null,
      test_type: testType,
      time_limit_minutes: body.time_limit_minutes ?? 120,
      created_by: gate.user.id,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    let hint = "";
    if (insertErr?.message?.includes("row-level security")) {
      const { data: profile } = await gate.supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", gate.user.id)
        .single();
      hint =
        ` Re-run docs/supabase-mock-tests-rls.sql in Supabase.` +
        ` Your profile is_admin=${String(profile?.is_admin ?? false)} (must be true).` +
        ` If using Option B, remove SUPABASE_SERVICE_ROLE_KEY from .env.local or leave ADMIN_API_USE_SERVICE_ROLE unset.`;
    }
    return NextResponse.json(
      { error: (insertErr?.message || "Failed to create mock test.") + hint },
      { status: 500 },
    );
  }

  const rows = buildMockTestTaskRows(inserted.id, testType, resolvedTaskIds);

  const { error: linkErr } = await db.from("mock_test_tasks").insert(rows);
  if (linkErr) {
    await db.from("mock_tests").delete().eq("id", inserted.id);
    const msg =
      linkErr.code === "23505"
        ? "One or more tasks are already used in another mock test."
        : linkErr.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  return NextResponse.json({ id: inserted.id, title, test_type: testType });
}
