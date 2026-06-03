import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const IMAGE_PATH = path.join(process.cwd(), "public/template-images/speaking-task-3.png");

export async function GET() {
  try {
    const image = await readFile(IMAGE_PATH);
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
