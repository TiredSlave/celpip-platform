import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

const FARM_SCENE_PATH =
  "/mnt/c/Users/dell/.cursor/projects/wsl-localhost-Ubuntu-home-andy-celpip-platform/assets/c__Users_dell_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_1778979608614-72d06a32-f88a-4f52-b613-eba2ad5faf55-8285621a-bcf6-4f15-9e95-8145c56a0cc6.png";

export async function GET() {
  try {
    const image = await readFile(FARM_SCENE_PATH);
    return new NextResponse(image, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Unable to load Speaking Task 3 image: ${String(error)}` },
      { status: 404 },
    );
  }
}
