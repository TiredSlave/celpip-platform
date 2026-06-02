import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateValidatedTask34Image } from "../../../../lib/speaking-task34-image";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function uploadImage(base64: string, filename: string): Promise<string | null> {
  try {
    const buffer = Buffer.from(base64, "base64");
    const { error } = await supabase.storage
      .from("task-images")
      .upload(filename, buffer, { contentType: "image/png", upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("task-images").getPublicUrl(filename);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const batchSizeRaw = Number(body?.batchSize ?? 5);
    const batchSize = Math.max(1, Math.min(10, Number.isFinite(batchSizeRaw) ? batchSizeRaw : 5));

    // Require an authenticated admin session (same scheme as generate-pair)
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

    const candidates: any[] = [];
    const warnings: string[] = [];

    // Generate sequentially to avoid hammering Stability.
    for (let i = 0; i < batchSize; i++) {
      const gen = await generateValidatedTask34Image();
      if (!gen.ok) {
        warnings.push(`candidate ${i + 1}: ${gen.error}`);
        continue;
      }

      const filename = `task34_candidate_${Date.now()}_${i}.png`;
      const url = await uploadImage(gen.base64, filename);
      if (!url) {
        warnings.push(`candidate ${i + 1}: upload failed`);
        continue;
      }

      candidates.push({
        image_url: url,
        activity_count: gen.activityCount,
        attempts: gen.attempts,
        validation_warning: gen.validationWarning,
        stability_prompt: gen.stabilityPrompt,
        stability_seed: gen.stabilitySeed,
        scene_setting: gen.scene.setting,
        scene_planned_by: gen.scenePlannedBy,
        llm_scene_plan: gen.scenePlan,
      });
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No candidates generated", warnings },
        { status: 500 },
      );
    }

    return NextResponse.json({ candidates, warnings });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

