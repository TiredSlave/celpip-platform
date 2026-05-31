import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../lib/supabase-admin";

/** Published mock tests for learners. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const order = (searchParams.get("order") || "asc").toLowerCase();
  const ascending = order !== "desc";

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("mock_tests")
    .select("id, title, description, test_type, time_limit_minutes, created_at, mock_test_tasks(count)")
    .eq("is_published", true)
    .order("created_at", { ascending });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tests: data || [], order: ascending ? "asc" : "desc" });
}
