import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../../../lib/supabase-admin";
import { getAuthedClient } from "../../../../lib/mock-test-auth";
import {
  findInProgressAttempt,
  getAttemptForUser,
  insertMockAttempt,
  migrationHintForAttemptError,
  normalizeAttemptRow,
  updateMockAttempt,
} from "../../../../lib/mock-test-attempt-db";
import type { MockPartResult, MockTaskResultsStorage } from "../../../../lib/mock-test-results";

type Params = { params: Promise<{ id: string }> };

/** Start or resume an in-progress attempt. */
export async function POST(request: Request, { params }: Params) {
  const { id: mockTestId } = await params;
  const authed = await getAuthedClient(request);
  if (!authed) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const admin = createSupabaseAdmin();

  const { data: test } = await admin
    .from("mock_tests")
    .select("id, is_published")
    .eq("id", mockTestId)
    .eq("is_published", true)
    .single();

  if (!test) return NextResponse.json({ error: "Mock test not found." }, { status: 404 });

  const { data: existing, error: findErr } = await findInProgressAttempt(
    admin,
    authed.user.id,
    mockTestId,
  );

  if (findErr) {
    console.error("mock_test_attempts find:", findErr);
    return NextResponse.json(
      { error: findErr.message + migrationHintForAttemptError(findErr) },
      { status: 500 },
    );
  }

  if (existing) return NextResponse.json({ attempt: existing });

  const { data: created, error } = await insertMockAttempt(admin, authed.user.id, mockTestId);

  if (error) {
    console.error("mock_test_attempts insert:", error);
    return NextResponse.json(
      { error: error.message + migrationHintForAttemptError(error) },
      { status: 500 },
    );
  }
  return NextResponse.json({ attempt: created });
}

/** GET attempt by id (query: attempt_id=) */
export async function GET(request: Request, { params }: Params) {
  const { id: mockTestId } = await params;
  const authed = await getAuthedClient(request);
  if (!authed) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const attemptId = new URL(request.url).searchParams.get("attempt_id");
  if (!attemptId) {
    return NextResponse.json({ error: "attempt_id is required." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: attempt, error } = await admin
    .from("mock_test_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", authed.user.id)
    .eq("mock_test_id", mockTestId)
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  return NextResponse.json({ attempt: normalizeAttemptRow(attempt) });
}

/** Save part result and optionally advance to next order. */
export async function PATCH(request: Request, { params }: Params) {
  const { id: mockTestId } = await params;
  const authed = await getAuthedClient(request);
  if (!authed) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: {
    attempt_id: string;
    order_number: number;
    result?: MockPartResult;
    advance?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const order = Number(body.order_number);
  if (!body.attempt_id || !Number.isInteger(order) || order < 1) {
    return NextResponse.json({ error: "attempt_id and order_number are required." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  const { data: row, error: getErr } = await getAttemptForUser(admin, {
    attemptId: body.attempt_id,
    userId: authed.user.id,
    mockTestId,
    inProgressOnly: true,
  });

  if (getErr) {
    return NextResponse.json(
      { error: getErr.message + migrationHintForAttemptError(getErr) },
      { status: 500 },
    );
  }

  if (!row) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const { data: slot } = await admin
    .from("mock_test_tasks")
    .select("order_number")
    .eq("mock_test_id", mockTestId)
    .eq("order_number", order)
    .maybeSingle();

  if (!slot) {
    return NextResponse.json({ error: "Invalid task order for this mock." }, { status: 400 });
  }

  const { data: allTasks } = await admin
    .from("mock_test_tasks")
    .select("order_number")
    .eq("mock_test_id", mockTestId)
    .order("order_number");

  const maxOrder = Math.max(...(allTasks || []).map(t => t.order_number), 0);

  const completed = new Set<number>((row.completed_orders as number[]) || []);
  completed.add(order);
  const completedList = [...completed].sort((a, b) => a - b);

  const taskResults: MockTaskResultsStorage = {
    ...(typeof row.task_results === "object" && row.task_results !== null
      ? (row.task_results as MockTaskResultsStorage)
      : {}),
    _completed_orders: completedList,
  };

  if (body.result) {
    taskResults[String(order)] = body.result;
  }

  let nextOrder = (row.current_order as number) ?? 1;
  if (body.advance) {
    nextOrder = order < maxOrder ? order + 1 : maxOrder + 1;
  }

  const { data: updated, error } = await updateMockAttempt(
    admin,
    row.id as string,
    {
      completed_orders: completedList,
      task_results: taskResults,
      current_order: nextOrder,
    },
    row,
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attempt: updated, maxOrder });
}

/** Final submit — only when every part is completed. */
export async function PUT(request: Request, { params }: Params) {
  const { id: mockTestId } = await params;
  const authed = await getAuthedClient(request);
  if (!authed) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { attempt_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.attempt_id) {
    return NextResponse.json({ error: "attempt_id is required." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  const { data: tasks } = await admin
    .from("mock_test_tasks")
    .select("order_number")
    .eq("mock_test_id", mockTestId)
    .order("order_number");

  const required = (tasks || []).map(t => t.order_number);
  if (required.length === 0) {
    return NextResponse.json({ error: "This mock test has no tasks." }, { status: 400 });
  }

  const { data: row, error: getErr } = await getAttemptForUser(admin, {
    attemptId: body.attempt_id,
    userId: authed.user.id,
    mockTestId,
    inProgressOnly: true,
  });

  if (getErr) {
    return NextResponse.json(
      { error: getErr.message + migrationHintForAttemptError(getErr) },
      { status: 500 },
    );
  }

  if (!row) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const done = new Set<number>((row.completed_orders as number[]) || []);
  const allDone = required.every(n => done.has(n));
  if (!allDone) {
    return NextResponse.json(
      { error: "Complete every part before submitting the mock test.", required, completed: [...done] },
      { status: 400 },
    );
  }

  const { data: submitted, error } = await updateMockAttempt(
    admin,
    row.id as string,
    {
      status: "submitted",
      submitted_at: new Date().toISOString(),
    },
    row,
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attempt: submitted });
}
