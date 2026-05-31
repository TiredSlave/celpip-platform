/**
 * Shared rules for Speaking Tasks 3/4/5/8.
 * CELPIP editorial cartoon in ONE unified picture — never a comic-strip page or panel grid.
 */

/** Must be first in Stability prompts — one square scene only. */
export const SINGLE_SNAPSHOT_PROMPT_LEAD =
  "ONE SINGLE CELPIP TEST PICTURE, one unified square illustration filling the entire frame, one continuous scene only, NOT comic strip NOT panel grid NOT collage";

export const SINGLE_SNAPSHOT_RETRY_LEAD =
  "EXACTLY ONE SINGLE ILLUSTRATION one square frame one scene only, NOT comic strip NOT panel grid NOT multiple frames";

/** Task 3/4 — clear CELPIP cartoon: 4–5 activities, uncluttered, easy to describe. */
export const TASK34_CLEAR_ILLUSTRATION_STYLE =
  "CELPIP English test practice picture, simple editorial cartoon, clean outlines, soft flat colors, calm even lighting, uncluttered composition, exactly 4-5 activity groups with open space between them, square framing, Canadian everyday setting, not photorealistic, no readable text";

/** @deprecated Use TASK34_CLEAR_ILLUSTRATION_STYLE */
export const TASK34_DENSE_ILLUSTRATION_STYLE = TASK34_CLEAR_ILLUSTRATION_STYLE;

/** @deprecated Use TASK34_CLEAR_ILLUSTRATION_STYLE */
export const TASK34_SIMPLE_ILLUSTRATION_STYLE = TASK34_CLEAR_ILLUSTRATION_STYLE;

/** @deprecated Use TASK34_DIVERSITY_RULE from speaking-task34-diversity.ts */
export const TASK34_ACTION_VERBS =
  "Each group must use a different main action and different props — not repeated helping, handing, or waiting poses.";

/**
 * General speaking image style (Tasks 5/8 etc.).
 */
export const CELPIP_COMIC_ILLUSTRATION_STYLE =
  "CELPIP English test practice picture, editorial cartoon style, clear flat colors, clean outlines, square framing, Canadian everyday setting, single unified illustration, no readable text";

/** @deprecated alias */
export const CELPIP_FLAT_ILLUSTRATION_STYLE = CELPIP_COMIC_ILLUSTRATION_STYLE;

export const SINGLE_SNAPSHOT_NEGATIVE_EXTRA =
  "comic strip, comic page, comic book page, manga page, newspaper comic, storyboard, multiple panels, panel grid, panel borders, panel gutters, grid of scenes, 4-panel, 6-panel, 9-panel, 12-panel, 18-panel, film strip, collage, triptych, diptych, multiple snapshots, side by side scenes, time lapse, sequential frames, photorealistic photograph";

/** Task 8 only — block normal/routine scenes Stability defaults to. */
export const TASK8_NORMAL_SCENE_NEGATIVE =
  "normal business meeting, conference room, office meeting, routine workplace, boring everyday, nothing unusual, panel grid, comic strip layout";
