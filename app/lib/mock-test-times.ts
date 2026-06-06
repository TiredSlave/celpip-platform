import type { MockTestSkill } from "./mock-test-types";
import { READING_PARTS } from "./reading-task-types";

/** Official-style per-part limits (seconds). */
export function secondsForMockPart(
  skill: MockTestSkill,
  order: number,
  taskType: string,
): number {
  if (skill === "Reading") {
    const part = READING_PARTS[order - 1];
    return (part?.timeMinutes ?? 11) * 60;
  }
  if (skill === "Writing") {
    return taskType.includes("Task 2") ? 26 * 60 : 27 * 60;
  }
  if (skill === "Speaking") {
    const m = taskType.match(/Speaking Task (\d)/);
    const n = m ? Number(m[1]) : 1;
    const prep = n === 5 || n === 6 ? 60 : 30;
    const speak = 60;
    return prep + speak + 15;
  }
  if (skill === "Listening") {
    if (taskType.includes("Problem Solving")) return 8 * 60;
    if (taskType.includes("Daily Life")) return 5 * 60;
    if (taskType.includes("Listening for Information")) return 6 * 60;
    if (taskType.includes("News Item")) return 5 * 60;
    if (taskType.includes("Discussion")) return 8 * 60;
    if (taskType.includes("Viewpoints")) return 6 * 60;
    return 8 * 60;
  }
  return 10 * 60;
}

export function formatMockTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Practice pages: show negative time after limit (e.g. -1:05). */
export function formatPracticeTime(seconds: number): string {
  const negative = seconds < 0;
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const label = `${m}:${s.toString().padStart(2, "0")}`;
  return negative ? `-${label}` : label;
}
