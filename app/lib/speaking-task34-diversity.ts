/** Prompt helpers — 4–5 clear, distinct activities; not crowded, not trivia. */

export const TASK34_DIVERSITY_RULE =
  "Each of the 4–5 groups must look different: different main action, different props, different spot in the scene. Not two groups doing the same type of thing.";

export const TASK34_ACTION_RULE =
  "Each group shows one clear purposeful action a test taker can describe and predict — not idle waiting, not background crowd.";

export const TASK34_CLARITY_RULE =
  "Keep the picture simple and readable: exactly 4 or 5 activity groups only, a few people per group, plain uncluttered background, minimal props, open space between groups, no extra crowd, no scattered trivia objects, not busy, not messy.";

/** Plain numbered list for the image model. */
export function formatActivityList(actions: string[]): string {
  return actions
    .slice(0, 5)
    .map((action, i) => `${i + 1}. ${action}`)
    .join(" ");
}

/** Retry — spaced apart so groups stay separate. */
export function formatSpacedActivities(
  actions: string[],
  slots: readonly string[],
): string {
  return actions
    .slice(0, 5)
    .map((action, i) => `${slots[i % slots.length]}: ${action}`)
    .join("; ");
}
