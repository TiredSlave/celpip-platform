import type { MockTestTaskRow, SequenceSlot } from "./mock-test-types";

export type SpeakingTaskRow = MockTestTaskRow & {
  task_group_id?: string | null;
  content?: unknown;
};

export type SpeakingTaskContent = {
  image_url?: string;
  task_number?: number;
  situation?: string;
  describe_focus?: string[];
  visual_description?: string;
  image_prompt?: string;
  generation_script?: {
    focal_points?: string[];
    prediction_hooks?: {
      id?: string | number;
      subject?: string;
      visible_now?: string;
      prediction_prompt?: string;
    }[];
    scene_setting?: string;
  };
  [key: string]: unknown;
};

export const SPEAKING_PAIR_34_SLOT_TITLE = "Speaking Task 3 + 4 (picture pair)";

/** Admin picks 7 slots; mock runner still uses 8 tasks. */
export const SPEAKING_ADMIN_PICK_COUNT = 7;
export const SPEAKING_RUNNER_TASK_COUNT = 8;

export function parseSpeakingTaskContent(content: unknown): SpeakingTaskContent | null {
  if (!content) return null;
  if (typeof content === "string") {
    try {
      return JSON.parse(content) as SpeakingTaskContent;
    } catch {
      return null;
    }
  }
  if (typeof content === "object") return content as SpeakingTaskContent;
  return null;
}

export function getSpeakingImageUrl(task: SpeakingTaskRow): string | undefined {
  return parseSpeakingTaskContent(task.content)?.image_url;
}

export function isSpeakingTask3(task: MockTestTaskRow): boolean {
  return task.task_type === "Speaking Task 3";
}

export function isSpeakingTask4(task: MockTestTaskRow): boolean {
  return task.task_type === "Speaking Task 4";
}

/** Find the Task 4 row that belongs to the same pair as this Task 3. */
export function findPairedSpeakingTask4(
  task3: SpeakingTaskRow,
  pool: SpeakingTaskRow[],
): SpeakingTaskRow | null {
  if (!isSpeakingTask3(task3)) return null;

  if (task3.task_group_id) {
    const byGroup = pool.find(
      t => isSpeakingTask4(t) && t.task_group_id === task3.task_group_id,
    );
    if (byGroup) return byGroup;
  }

  const imageUrl = getSpeakingImageUrl(task3);
  if (imageUrl) {
    const byImage = pool.find(
      t => isSpeakingTask4(t) && getSpeakingImageUrl(t) === imageUrl,
    );
    if (byImage) return byImage;
  }

  return null;
}

/** Task 3 options that have a usable paired Task 4 (and neither is blocked). */
export function speakingTask3WithPairChoices(
  pool: SpeakingTaskRow[],
  blockedIds: Set<string>,
): SpeakingTaskRow[] {
  return pool.filter(t3 => {
    if (!isSpeakingTask3(t3)) return false;
    if (blockedIds.has(t3.id)) return false;
    const t4 = findPairedSpeakingTask4(t3, pool);
    if (!t4) return false;
    if (blockedIds.has(t4.id)) return false;
    return true;
  });
}

export function isSpeakingPair34Slot(slot: SequenceSlot): boolean {
  return Boolean(slot.speakingPair34);
}

/** Expand 7 admin picks → 8 task ids (inserts paired Task 4 after Task 3). */
export function expandSpeakingAdminPicks(
  adminPickIds: string[],
  pool: SpeakingTaskRow[],
): { ok: true; taskIds: string[] } | { ok: false; error: string } {
  if (adminPickIds.length !== SPEAKING_ADMIN_PICK_COUNT) {
    return {
      ok: false,
      error: `Speaking mocks need ${SPEAKING_ADMIN_PICK_COUNT} selections (Task 3 includes paired Task 4).`,
    };
  }

  const byId = Object.fromEntries(pool.map(t => [t.id, t]));
  const out: string[] = [];
  let pickIdx = 0;

  const adminSteps: ({ kind: "single"; type: string } | { kind: "pair34" })[] = [
    { kind: "single", type: "Speaking Task 1" },
    { kind: "single", type: "Speaking Task 2" },
    { kind: "pair34" },
    { kind: "single", type: "Speaking Task 5" },
    { kind: "single", type: "Speaking Task 6" },
    { kind: "single", type: "Speaking Task 7" },
    { kind: "single", type: "Speaking Task 8" },
  ];

  for (const step of adminSteps) {
    if (step.kind === "pair34") {
      const t3Id = adminPickIds[pickIdx++];
      const t3 = byId[t3Id];
      if (!t3 || !isSpeakingTask3(t3)) {
        return { ok: false, error: "Speaking Task 3 + 4 requires a valid Speaking Task 3 with a paired Task 4." };
      }
      const t4 = findPairedSpeakingTask4(t3, pool);
      if (!t4) {
        const title = (t3.title || t3.id).slice(0, 80);
        return {
          ok: false,
          error: `No paired Speaking Task 4 found for "${title}". Open the Task 3 in Tasks and click "Create paired Task 4", or generate a new 3+4 pair.`,
        };
      }
      out.push(t3.id, t4.id);
      continue;
    }
    const id = adminPickIds[pickIdx++];
    const task = byId[id];
    if (!task || task.task_type !== step.type) {
      return { ok: false, error: `Selection does not match ${step.type}.` };
    }
    out.push(id);
  }

  if (out.length !== SPEAKING_RUNNER_TASK_COUNT) {
    return { ok: false, error: "Invalid speaking task selection." };
  }
  return { ok: true, taskIds: out };
}

/** Collapse 8 stored task ids → 7 admin picks (drops Task 4 after Task 3). */
export function collapseSpeakingFullIds(fullIds: string[], pool: SpeakingTaskRow[]): string[] {
  const byId = Object.fromEntries(pool.map(t => [t.id, t]));
  const out: string[] = [];
  for (const id of fullIds) {
    const task = byId[id];
    if (task && isSpeakingTask4(task)) continue;
    out.push(id);
  }
  return out;
}

export function formatSpeaking34PickLabel(task3: SpeakingTaskRow, task4: SpeakingTaskRow): string {
  const title = (task3.title || "Untitled").slice(0, 48);
  return `Speaking Task 3 + 4 — ${title} (auto: Task 4)`;
}

export function speakingTask3NeedsPair(task3: SpeakingTaskRow, pool: SpeakingTaskRow[]): boolean {
  return isSpeakingTask3(task3) && !findPairedSpeakingTask4(task3, pool);
}
