import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type MockTestSkill,
  getSequenceForSkill,
  inferSkillFromTaskType,
  taskBelongsToSkill,
} from "./mock-test-types";
import {
  expandSpeakingAdminPicks,
  findPairedSpeakingTask4,
  SPEAKING_RUNNER_TASK_COUNT,
} from "./speaking-task-pairs";

export async function validateMockTestTaskIds(
  admin: SupabaseClient,
  testType: MockTestSkill,
  taskIds: string[],
  options?: { excludeMockTestId?: string },
): Promise<{ ok: true; taskIds: string[] } | { ok: false; error: string; status: number }> {
  let resolvedIds = taskIds;

  if (testType === "Speaking") {
    const { data: speakingPool } = await admin
      .from("admin_tasks")
      .select("id, task_type, title, task_group_id, content")
      .ilike("task_type", "Speaking%");

    const pool = speakingPool || [];
    if (taskIds.length === SPEAKING_RUNNER_TASK_COUNT) {
      const t3 = pool.find(t => t.id === taskIds[2]);
      const t4 = pool.find(t => t.id === taskIds[3]);
      if (t3?.task_type === "Speaking Task 3" && t4?.task_type === "Speaking Task 4") {
        const paired = findPairedSpeakingTask4(t3, pool);
        if (!paired || paired.id !== t4?.id) {
          return {
            ok: false,
            status: 400,
            error: "Speaking Task 3 and Task 4 must be a matching picture pair.",
          };
        }
      }
      resolvedIds = taskIds;
    } else {
      const expanded = expandSpeakingAdminPicks(taskIds, pool);
      if (!expanded.ok) {
        return { ok: false, status: 400, error: expanded.error };
      }
      resolvedIds = expanded.taskIds;
    }
  }

  if (new Set(resolvedIds).size !== resolvedIds.length) {
    return { ok: false, status: 400, error: "Each task can only appear once in the mock." };
  }

  const expectedSteps =
    testType === "Speaking" ? SPEAKING_RUNNER_TASK_COUNT : getSequenceForSkill(testType).length;
  if (resolvedIds.length !== expectedSteps) {
    return {
      ok: false,
      status: 400,
      error: `This ${testType} mock needs exactly ${expectedSteps} tasks.`,
    };
  }

  const { data: tasks, error: tasksErr } = await admin
    .from("admin_tasks")
    .select("id, task_type, title, task_group_id, content")
    .in("id", resolvedIds);

  if (tasksErr) {
    return { ok: false, status: 500, error: tasksErr.message };
  }
  if (!tasks || tasks.length !== resolvedIds.length) {
    return { ok: false, status: 400, error: "One or more tasks were not found in the library." };
  }

  const taskById = Object.fromEntries(tasks.map(t => [t.id, t]));
  const sequence = getSequenceForSkill(testType);

  for (let i = 0; i < resolvedIds.length; i++) {
    const task = taskById[resolvedIds[i]];
    if (!task) {
      return { ok: false, status: 400, error: `Missing task at position ${i + 1}.` };
    }
    const skill = inferSkillFromTaskType(task.task_type);
    if (skill !== testType || !sequence[i].matches(task)) {
      return {
        ok: false,
        status: 400,
        error: `Task at step ${i + 1} does not match ${sequence[i].stepTitle}.`,
      };
    }
    if (!taskBelongsToSkill(task, testType)) {
      return { ok: false, status: 400, error: `Task at step ${i + 1} is not a ${testType} task.` };
    }
  }

  const { data: used, error: usedErr } = await admin
    .from("mock_test_tasks")
    .select("task_id, mock_test_id")
    .in("task_id", resolvedIds);
  if (usedErr) {
    return { ok: false, status: 500, error: usedErr.message };
  }

  const excludeId = options?.excludeMockTestId;
  const conflicts = (used || []).filter(
    row => !excludeId || row.mock_test_id !== excludeId,
  );
  if (conflicts.length > 0) {
    return {
      ok: false,
      status: 409,
      error: "One or more tasks are already assigned to another mock test.",
    };
  }

  return { ok: true, taskIds: resolvedIds };
}

export function buildMockTestTaskRows(
  mockTestId: string,
  testType: MockTestSkill,
  taskIds: string[],
) {
  return taskIds.map((taskId, i) => ({
    mock_test_id: mockTestId,
    task_id: taskId,
    order_number: i + 1,
    section: testType,
  }));
}
