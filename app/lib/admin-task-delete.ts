import type { SupabaseClient } from "@supabase/supabase-js";
import { getSequenceForSkill, type MockTestSkill } from "./mock-test-types";
import { SPEAKING_RUNNER_TASK_COUNT } from "./speaking-task-pairs";

export type MockTestUsingTask = {
  id: string;
  title: string;
  test_type: MockTestSkill | null;
  is_published: boolean;
};

export function expectedMockTaskCount(testType: MockTestSkill | null): number | null {
  if (!testType) return null;
  if (testType === "Speaking") return SPEAKING_RUNNER_TASK_COUNT;
  return getSequenceForSkill(testType).length;
}

/** Mock tests that currently include this library task. */
export async function findMockTestsUsingTask(
  admin: SupabaseClient,
  taskId: string,
): Promise<MockTestUsingTask[]> {
  const { data, error } = await admin
    .from("mock_test_tasks")
    .select("mock_test_id, mock_tests(id, title, test_type, is_published)")
    .eq("task_id", taskId);

  if (error) throw new Error(error.message);

  const byId = new Map<string, MockTestUsingTask>();
  for (const row of data || []) {
    const mt = row.mock_tests as MockTestUsingTask | MockTestUsingTask[] | null;
    const mock = Array.isArray(mt) ? mt[0] : mt;
    if (mock?.id) byId.set(mock.id, mock);
  }
  return [...byId.values()];
}

/** Part counts per mock before removing a task link. */
export async function countMockTestParts(
  admin: SupabaseClient,
  mockTestIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const mockId of mockTestIds) {
    const { count, error } = await admin
      .from("mock_test_tasks")
      .select("id", { count: "exact", head: true })
      .eq("mock_test_id", mockId);
    if (!error) counts.set(mockId, count ?? 0);
  }
  return counts;
}

/**
 * After a task is removed from mock_test_tasks, any mock that no longer has
 * the required number of parts is unpublished so learners cannot start a broken test.
 */
export async function unpublishBrokenMockTests(
  admin: SupabaseClient,
  mockTestIds: string[],
  partsBefore: Map<string, number>,
): Promise<MockTestUsingTask[]> {
  const unpublished: MockTestUsingTask[] = [];

  for (const mockId of mockTestIds) {
    const { data: mock, error: mockErr } = await admin
      .from("mock_tests")
      .select("id, title, test_type, is_published")
      .eq("id", mockId)
      .single();

    if (mockErr || !mock) continue;

    const { count, error: countErr } = await admin
      .from("mock_test_tasks")
      .select("id", { count: "exact", head: true })
      .eq("mock_test_id", mockId);

    if (countErr) continue;

    const partCount = count ?? 0;
    const expected = expectedMockTaskCount(mock.test_type as MockTestSkill | null);
    const before = partsBefore.get(mockId);
    const incomplete =
      expected !== null
        ? partCount < expected
        : before !== undefined
          ? partCount < before
          : partCount === 0;

    if (incomplete && mock.is_published) {
      const { error: upErr } = await admin
        .from("mock_tests")
        .update({ is_published: false })
        .eq("id", mockId);
      if (!upErr) {
        unpublished.push({ ...mock, is_published: false } as MockTestUsingTask);
      }
    }
  }

  return unpublished;
}
