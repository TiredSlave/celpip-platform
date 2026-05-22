import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

const BEAR_SCENE_PATH =
  "/mnt/c/Users/dell/.cursor/projects/wsl-localhost-Ubuntu-home-andy-celpip-platform/assets/c__Users_dell_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_612e5133-1949-4e01-83fb-87611ee4d6dc-563ec97d-beab-450c-8c0b-61950748e30a.png";

export async function GET() {
  try {
    const image = await readFile(BEAR_SCENE_PATH);
    return new NextResponse(image, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Unable to load Speaking Task 8 image: ${String(error)}` },
      { status: 404 },
    );
  }
}
