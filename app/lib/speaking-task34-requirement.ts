/**
 * CELPIP Speaking Task 3 & 4 — ONE snapshot only.
 */
export const SPEAKING_TASK34_REQUIREMENT = {
  summary:
    "ONE snapshot: one square cartoon of one scene at one moment, with 5 unrelated activities.",
  snapshot:
    "Exactly ONE image — like a single camera click. NOT several pictures. NOT the same place at different times.",
  oneScene:
    "One continuous place (park, pool, library, transit station, clinic, etc.) in that single photograph.",
  activities:
    "Exactly 5 unrelated affairs at the same instant — each an obvious purposeful action a test taker can describe and predict next, not idle waiting.",
  diversity:
    "5 different action categories — not 2+ groups in the same category (e.g. typing + writing + reading = all desk/study = FAIL).",
  equalFocus:
    "Each activity equally easy to see — simple uncluttered picture, open space between groups, no trivia clutter.",
  notWanted:
    "FORBIDDEN: comic panels, crowded messy scenes, 2+ groups sharing one action category (all seated reading/typing/writing, all helping, all eating), clone poses, everyone idle, empty scene.",
} as const;

export const SPEAKING_TASK34_REQUIREMENT_PROMPT = [
  SPEAKING_TASK34_REQUIREMENT.snapshot,
  SPEAKING_TASK34_REQUIREMENT.summary,
  SPEAKING_TASK34_REQUIREMENT.diversity,
  SPEAKING_TASK34_REQUIREMENT.equalFocus,
  SPEAKING_TASK34_REQUIREMENT.oneScene,
  SPEAKING_TASK34_REQUIREMENT.activities,
  SPEAKING_TASK34_REQUIREMENT.notWanted,
].join(" ");

/** Exact wording shown to test takers (practice UI and saved task content). */
export const SPEAKING_TASK3_LEARNER_PROMPT =
  "Describe some things that are happening in the picture below as well as you can. The person with whom you are speaking cannot see the picture.";

export const SPEAKING_TASK4_LEARNER_PROMPT =
  "In this picture, what do you think will happen next?";

export const SPEAKING_TASK5_LEARNER_PROMPT =
  "Choose Picture A or Picture B. Describe your chosen picture in detail and persuade the person below that your choice is better. Briefly mention one reason the other option is less suitable.";

export const SPEAKING_TASK8_LEARNER_PROMPT =
  "Describe an unusual situation in the picture below as well as you can. The person with whom you are speaking cannot see the picture.";

export const SPEAKING_TASK3_AUTHORING_GUIDANCE =
  "One scene, one square snapshot, exactly 5 purposeful activities — simple picture, easy to describe and predict; no crowd, no trivia clutter.";

const LEGACY_TASK3_PROMPT_MARKERS = [
  "unrelated activities",
  "varied affairs",
  "one snapshot",
  "4 or 5",
  "5 unrelated",
];

/** Official CELPIP wording for practice UI; fixes older tasks saved with setter-only text. */
export function speakingTask34LearnerPrompt(
  taskNumber: number,
  storedPrompt?: string,
): string | undefined {
  if (taskNumber === 3) {
    if (
      storedPrompt &&
      !LEGACY_TASK3_PROMPT_MARKERS.some((m) =>
        storedPrompt.toLowerCase().includes(m),
      )
    ) {
      return storedPrompt;
    }
    return SPEAKING_TASK3_LEARNER_PROMPT;
  }
  if (taskNumber === 4) {
    return SPEAKING_TASK4_LEARNER_PROMPT;
  }
  return storedPrompt;
}
