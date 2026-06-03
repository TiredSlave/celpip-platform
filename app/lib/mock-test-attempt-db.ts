import type { SupabaseClient } from "@supabase/supabase-js";
import type { MockTaskResultsStorage } from "./mock-test-results";

/** Postgres undefined_column or PostgREST schema cache (PGRST204). */
export function isSchemaColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST204" || error.code === "42703") return true;
  const msg = error.message || "";
  return /could not find the .* column/i.test(msg) || /column.*does not exist/i.test(msg);
}

type AttemptRow = Record<string, unknown>;

const META_COMPLETED = "_completed_orders";
const META_STATUS = "_status";

function taskResultsOf(row: AttemptRow): MockTaskResultsStorage {
  if (typeof row.task_results === "object" && row.task_results !== null) {
    return row.task_results as MockTaskResultsStorage;
  }
  return {};
}

/** Normalize attempt row so status / completed_orders exist for app logic. */
export function normalizeAttemptRow(row: AttemptRow): AttemptRow {
  const tr = taskResultsOf(row);
  let status = typeof row.status === "string" ? row.status : tr[META_STATUS];
  if (!status) {
    status = row.submitted_at ? "submitted" : "in_progress";
  }

  let completed_orders: number[];
  if (Array.isArray(row.completed_orders)) {
    completed_orders = row.completed_orders as number[];
  } else if (Array.isArray(tr[META_COMPLETED])) {
    completed_orders = tr[META_COMPLETED];
  } else {
    completed_orders = Object.keys(tr)
      .filter(k => k !== META_COMPLETED && k !== META_STATUS && /^\d+$/.test(k))
      .map(Number)
      .sort((a, b) => a - b);
  }

  const current_order =
    typeof row.current_order === "number"
      ? row.current_order
      : typeof tr._current_order === "number"
        ? tr._current_order
        : 1;

  return {
    ...row,
    status,
    completed_orders,
    current_order,
    task_results: row.task_results ?? tr,
  };
}

async function tryInsert(admin: SupabaseClient, payload: Record<string, unknown>) {
  return admin.from("mock_test_attempts").insert(payload).select("*").single();
}

export async function insertMockAttempt(
  admin: SupabaseClient,
  userId: string,
  mockTestId: string,
): Promise<{ data: AttemptRow | null; error: { message: string; code?: string } | null }> {
  const metaResults = {
    [META_STATUS]: "in_progress",
    [META_COMPLETED]: [] as number[],
  };

  const payloads: Record<string, unknown>[] = [
    {
      user_id: userId,
      mock_test_id: mockTestId,
      status: "in_progress",
      completed_orders: [] as number[],
      task_results: metaResults,
      current_order: 1,
    },
    {
      user_id: userId,
      mock_test_id: mockTestId,
      status: "in_progress",
      completed_orders: [] as number[],
    },
    {
      user_id: userId,
      mock_test_id: mockTestId,
      task_results: metaResults,
    },
    {
      user_id: userId,
      mock_test_id: mockTestId,
    },
  ];

  let lastError: { message: string; code?: string } | null = null;

  for (const payload of payloads) {
    const result = await tryInsert(admin, payload);
    if (!result.error && result.data) {
      return { data: normalizeAttemptRow(result.data as AttemptRow), error: null };
    }
    lastError = result.error;
    if (!isSchemaColumnError(result.error)) break;
  }

  return { data: null, error: lastError };
}

export async function findInProgressAttempt(
  admin: SupabaseClient,
  userId: string,
  mockTestId: string,
): Promise<{ data: AttemptRow | null; error: { message: string; code?: string } | null }> {
  const withStatus = await admin
    .from("mock_test_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("mock_test_id", mockTestId)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!withStatus.error) {
    return {
      data: withStatus.data ? normalizeAttemptRow(withStatus.data as AttemptRow) : null,
      error: null,
    };
  }

  if (!isSchemaColumnError(withStatus.error)) {
    return { data: null, error: withStatus.error };
  }

  const fallback = await admin
    .from("mock_test_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("mock_test_id", mockTestId)
    .limit(20);

  if (fallback.error) {
    return { data: null, error: fallback.error };
  }

  const rows = (fallback.data || []) as AttemptRow[];
  rows.sort((a, b) => {
    const ta = new Date(String(a.created_at || 0)).getTime();
    const tb = new Date(String(b.created_at || 0)).getTime();
    return tb - ta;
  });

  const found = rows.find(r => normalizeAttemptRow(r).status === "in_progress") ?? null;
  return { data: found ? normalizeAttemptRow(found) : null, error: null };
}

export async function getAttemptForUser(
  admin: SupabaseClient,
  opts: {
    attemptId: string;
    userId: string;
    mockTestId: string;
    inProgressOnly?: boolean;
  },
): Promise<{ data: AttemptRow | null; error: { message: string; code?: string } | null }> {
  const base = admin
    .from("mock_test_attempts")
    .select("*")
    .eq("id", opts.attemptId)
    .eq("user_id", opts.userId)
    .eq("mock_test_id", opts.mockTestId);

  if (opts.inProgressOnly) {
    const filtered = await base.eq("status", "in_progress").single();
    if (!filtered.error && filtered.data) {
      return { data: normalizeAttemptRow(filtered.data as AttemptRow), error: null };
    }
    if (filtered.error && !isSchemaColumnError(filtered.error)) {
      return { data: null, error: filtered.error };
    }

    const plain = await base.single();
    if (plain.error || !plain.data) {
      return { data: null, error: plain.error };
    }
    const row = normalizeAttemptRow(plain.data as AttemptRow);
    if (row.status !== "in_progress") {
      return { data: null, error: null };
    }
    return { data: row, error: null };
  }

  const result = await base.single();
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }
  return { data: normalizeAttemptRow(result.data as AttemptRow), error: null };
}

export async function updateMockAttempt(
  admin: SupabaseClient,
  attemptId: string,
  fields: Record<string, unknown>,
  existingRow?: AttemptRow,
): Promise<{ data: AttemptRow | null; error: { message: string; code?: string } | null }> {
  const payload = { ...fields };

  const tryUpdate = async (body: Record<string, unknown>, touchUpdatedAt = true) => {
    const patch = touchUpdatedAt ? { ...body, updated_at: new Date().toISOString() } : body;
    return admin
      .from("mock_test_attempts")
      .update(patch)
      .eq("id", attemptId)
      .select("*")
      .single();
  };

  let result = await tryUpdate(payload);

  if (result.error && isSchemaColumnError(result.error)) {
    const fallback: Record<string, unknown> = { ...payload };
    delete fallback.completed_orders;
    delete fallback.current_order;
    delete fallback.status;

    const tr = {
      ...taskResultsOf(existingRow || {}),
      ...(typeof payload.task_results === "object" && payload.task_results !== null
        ? (payload.task_results as MockTaskResultsStorage)
        : {}),
    };

    if (Array.isArray(payload.completed_orders)) {
      tr[META_COMPLETED] = payload.completed_orders as number[];
    }
    if (typeof payload.status === "string") {
      tr[META_STATUS] = payload.status;
    }
    if (typeof payload.current_order === "number") {
      (tr as Record<string, unknown>)._current_order = payload.current_order;
    }

    fallback.task_results = tr;

    result = await tryUpdate(fallback);

    if (result.error && isSchemaColumnError(result.error)) {
      const minimal: Record<string, unknown> = {};
      if (payload.submitted_at !== undefined) minimal.submitted_at = payload.submitted_at;
      if (Object.keys(minimal).length > 0) {
        result = await tryUpdate(minimal);
      }
      if (result.error && isSchemaColumnError(result.error)) {
        result = await tryUpdate({ task_results: tr }, false);
      }
    }
  }

  if (result.error) {
    return { data: null, error: result.error };
  }

  return {
    data: normalizeAttemptRow(result.data as AttemptRow),
    error: null,
  };
}

export function migrationHintForAttemptError(error: { code?: string; message?: string }): string {
  const msg = error.message || "";
  if (error.code === "PGRST204" || /could not find the/i.test(msg)) {
    return (
      " Run docs/supabase-mock-tests-repair.sql in the Supabase SQL Editor, " +
      "then open Settings → API → Reload schema."
    );
  }
  if (/mock_test_attempts/i.test(msg)) {
    return " Run docs/supabase-mock-tests.sql in Supabase.";
  }
  return "";
}
