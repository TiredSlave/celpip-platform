/** Prompt helpers — 5 clear, distinct activities; not crowded, not trivia. */

export const TASK34_PEOPLE_RULE =
  "MUST show exactly 5 GROUPS OF PEOPLE — each group doing one visible action. NEVER an empty patio, vacant room, furniture only, or scene with no people.";

export const TASK34_ACTION_CATEGORY_EXAMPLES =
  "Action categories include: desk/study (typing, writing, reading, studying — all ONE category), helping, paying, eating, sport/physical, cleaning, carrying, playing, teaching demo. No two groups may share a category.";

export const TASK34_DIVERSITY_RULE =
  "Each of the 5 groups must use a different action category — not two seated desk actions (typing + writing + reading count as the same category), not two helping scenes, not two eating scenes.";

export const TASK34_ACTION_RULE =
  "Each group shows one clear purposeful action a test taker can describe and predict — not idle waiting, not background crowd.";

export const TASK34_CLARITY_RULE =
  "Keep the picture simple and readable: exactly 5 activity groups only, a few people per group, plain uncluttered background, minimal props, open space between groups, no extra crowd, no scattered trivia objects, not busy, not messy.";

/** Stability-only — image models ignore this if buried under other rules. */
export const TASK34_STABILITY_ANTI_DESK =
  "NOT desks, NOT office, NOT library study tables, NOT reading, NOT writing, NOT typing, NOT notebooks, NOT papers, NOT meeting circle, NOT seated discussion group, NOT classroom seminar — each group must STAND or MOVE doing a different physical or service action.";

export const TASK34_STABILITY_MOVEMENT_RULE =
  "Each activity group must show a visible verb: jumping, paying, mopping, carrying, eating, sweeping, throwing, skating, swimming, lifting, scanning a card — not idle sitting.";

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
