import { NextResponse } from "next/server";

/**
 * Public/demo reading generation — delegates to admin route (shared passage constraints).
 */
export async function POST(request: Request) {
  const body = await request.json();
  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/api/admin/reading/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data);
}
