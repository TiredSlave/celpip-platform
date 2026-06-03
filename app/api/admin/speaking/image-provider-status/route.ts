import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getSpeakingImageRuntimeInfo,
  probeFalAccount,
} from "@/app/lib/speaking-image-provider";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") || "";
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseUser
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const runtime = getSpeakingImageRuntimeInfo();
  const falProbe =
    runtime.configuredProvider === "fal" && runtime.hasFalKey
      ? await probeFalAccount()
      : null;

  return NextResponse.json({
    runtime,
    falProbe,
    hints: [
      "Restart `npm run dev` after changing SPEAKING_IMAGE_PROVIDER or API keys in .env.local.",
      "fal: set SPEAKING_IMAGE_PROVIDER=fal and FAL_KEY.",
      "Fal API keys belong to one account — balance must match the key (fal.ai dashboard).",
      "Set SPEAKING_IMAGE_FAL_FALLBACK=false to disable Stability fallback while debugging Fal.",
    ],
  });
}
