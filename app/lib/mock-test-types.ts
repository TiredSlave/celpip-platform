import {
  READING_TASK_TYPE_KEYS,
  isReadingAdminTask,
  matchesReadingPracticeFilter,
  readingPartLabel,
} from "./reading-task-types";

export const MOCK_TEST_SKILLS = ["Listening", "Reading", "Writing", "Speaking"] as const;
export type MockTestSkill = (typeof MOCK_TEST_SKILLS)[number];

export type MockTestTaskRow = {
  id: string;
  task_type: string;
  title?: string | null;
  section?: string | null;
};

const LISTENING_ORDER = [
  "Listening - Problem Solving",
  "Listening - Daily Life Conversation",
  "Listening - Listening for Information",
  "Listening - News Item",
  "Listening - Discussion",
  "Listening - Viewpoints",
] as const;

const WRITING_ORDER = ["Writing Task 1", "Writing Task 2"] as const;

const SPEAKING_ORDER = [
  "Speaking Task 1",
  "Speaking Task 2",
  "Speaking Task 3",
  "Speaking Task 4",
  "Speaking Task 5",
  "Speaking Task 6",
  "Speaking Task 7",
  "Speaking Task 8",
] as const;

export type SequenceSlot = {
  section: MockTestSkill;
  stepTitle: string;
  matches: (t: MockTestTaskRow) => boolean;
  /** Speaking: one admin step selects Task 3; Task 4 is added automatically. */
  speakingPair34?: boolean;
};

function taskMatchesSlotType(t: MockTestTaskRow, primary: string): boolean {
  if (t.task_type === primary) return true;
  if (primary.startsWith("Listening -")) {
    const tail = primary.replace(/^Listening - /, "");
    return t.task_type.includes("Listening") && t.task_type.includes(tail);
  }
  return false;
}

function slotFromListeningType(type: (typeof LISTENING_ORDER)[number]): SequenceSlot {
  const short = type.replace("Listening - ", "");
  return {
    section: "Listening",
    stepTitle: `Listening — ${short}`,
    matches: t => taskMatchesSlotType(t, type),
  };
}

function slotFromReadingType(type: (typeof READING_TASK_TYPE_KEYS)[number]): SequenceSlot {
  return {
    section: "Reading",
    stepTitle: readingPartLabel(type),
    matches: t => matchesReadingPracticeFilter(t, type),
  };
}

function slotFromWritingType(type: (typeof WRITING_ORDER)[number]): SequenceSlot {
  return {
    section: "Writing",
    stepTitle: type,
    matches: t => t.task_type === type,
  };
}

function slotFromSpeakingType(type: (typeof SPEAKING_ORDER)[number]): SequenceSlot {
  return {
    section: "Speaking",
    stepTitle: type,
    matches: t => t.task_type === type,
  };
}

function slotSpeakingTask34Pair(): SequenceSlot {
  return {
    section: "Speaking",
    stepTitle: "Speaking Task 3 + 4 (picture pair)",
    matches: t => t.task_type === "Speaking Task 3",
    speakingPair34: true,
  };
}

/** Runner / validation: all 8 speaking tasks in order. */
export function getSequenceForSkill(skill: MockTestSkill): SequenceSlot[] {
  switch (skill) {
    case "Listening":
      return LISTENING_ORDER.map(slotFromListeningType);
    case "Reading":
      return READING_TASK_TYPE_KEYS.map(slotFromReadingType);
    case "Writing":
      return WRITING_ORDER.map(slotFromWritingType);
    case "Speaking":
      return SPEAKING_ORDER.map(slotFromSpeakingType);
    default:
      return [];
  }
}

/** Admin builder: Task 3 and 4 are one step (select Task 3 only). */
export function getAdminSequenceForSkill(skill: MockTestSkill): SequenceSlot[] {
  if (skill !== "Speaking") return getSequenceForSkill(skill);
  return [
    slotFromSpeakingType("Speaking Task 1"),
    slotFromSpeakingType("Speaking Task 2"),
    slotSpeakingTask34Pair(),
    slotFromSpeakingType("Speaking Task 5"),
    slotFromSpeakingType("Speaking Task 6"),
    slotFromSpeakingType("Speaking Task 7"),
    slotFromSpeakingType("Speaking Task 8"),
  ];
}

export function expectedAdminPickCount(skill: MockTestSkill): number {
  return getAdminSequenceForSkill(skill).length;
}

export function tasksForSlot(tasks: MockTestTaskRow[], slot: SequenceSlot): MockTestTaskRow[] {
  return tasks.filter(slot.matches);
}

export function inferSkillFromTaskType(taskType: string): MockTestSkill | null {
  if (taskType.includes("Listening")) return "Listening";
  if (taskType.includes("Speaking")) return "Speaking";
  if (taskType.includes("Writing")) return "Writing";
  if (isReadingAdminTask({ task_type: taskType })) return "Reading";
  return null;
}

export function taskBelongsToSkill(task: MockTestTaskRow, skill: MockTestSkill): boolean {
  if (skill === "Reading") return isReadingAdminTask(task);
  return task.task_type.includes(skill);
}

export function practiceTaskHref(
  skill: MockTestSkill,
  taskId: string,
  attemptId: string,
  order: number,
  mockTestId: string,
): string {
  const q =
    `taskId=${encodeURIComponent(taskId)}` +
    `&mockAttempt=${encodeURIComponent(attemptId)}` +
    `&mockOrder=${order}` +
    `&mockTest=${encodeURIComponent(mockTestId)}`;
  switch (skill) {
    case "Writing":
      return `/practice/writing/task?${q}`;
    case "Reading":
      return `/practice/reading/task?${q}`;
    case "Speaking":
      return `/practice/speaking/task?${q}`;
    case "Listening":
      return `/practice/listening/task?${q}`;
    default:
      return `/practice`;
  }
}
