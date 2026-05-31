"use client";

import { useEffect, useState } from "react";
import {
  fetchPracticeTaskSiblings,
  type PracticeSection,
  type TaskSiblings,
} from "./practice-task-nav";
import type { ReadingTaskRow } from "./reading-task-types";

const EMPTY: TaskSiblings = {
  prevId: null,
  nextId: null,
  position: 0,
  total: 0,
};

export function usePracticeTaskSiblings(
  section: PracticeSection,
  taskId: string | null,
  taskType: string | undefined,
  row?: ReadingTaskRow,
) {
  const [siblings, setSiblings] = useState<TaskSiblings>(EMPTY);

  useEffect(() => {
    if (!taskId || !taskType?.trim()) {
      setSiblings(EMPTY);
      return;
    }

    let cancelled = false;
    void fetchPracticeTaskSiblings(section, taskId, taskType, row).then(result => {
      if (!cancelled) setSiblings(result);
    });

    return () => {
      cancelled = true;
    };
  }, [section, taskId, taskType, row?.task_type, row?.section, row?.sequence_number]);

  return siblings;
}
