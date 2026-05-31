/** Client-safe helpers for displaying Task 5 content (no server/API imports). */

export function task5OptionImageUrl(
  content: {
    option_a?: { image_url?: string };
    option_b?: { image_url?: string };
    image_url_1?: string;
    image_url_2?: string;
  },
  side: "A" | "B",
): string | undefined {
  if (side === "A") {
    return content.option_a?.image_url || content.image_url_1;
  }
  return content.option_b?.image_url || content.image_url_2;
}
