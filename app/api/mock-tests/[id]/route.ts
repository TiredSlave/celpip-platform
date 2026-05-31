import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../../lib/supabase-admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: test, error } = await admin
    .from("mock_tests")
    .select("id, title, description, test_type, time_limit_minutes, is_published")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (error || !test) {
    return NextResponse.json({ error: "Mock test not found." }, { status: 404 });
  }

  const { data: tasks, error: tasksErr } = await admin
    .from("mock_test_tasks")
    .select(
      "id, order_number, section, task_id, admin_tasks(id, task_type, title, content, section, sequence_number)",
    )
    .eq("mock_test_id", id)
    .order("order_number");

  if (tasksErr) return NextResponse.json({ error: tasksErr.message }, { status: 500 });

  return NextResponse.json({ test, tasks: tasks || [] });
}
