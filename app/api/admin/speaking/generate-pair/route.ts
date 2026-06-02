import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSpeakingImage } from "../../../../lib/speaking-image-generate";
import {
  generateValidatedTask34Image,
  SPEAKING_TASK34_REQUIREMENT,
} from "../../../../lib/speaking-task34-image";
import {
  alignTask34ContentToImage,
  alignTask4SampleToImage,
  alignTask5SampleAnswerFromImages,
  type Task5SampleAnswerResult,
} from "../../../../lib/speaking-image-vision";
import {
  buildTask34PredictionBrief,
  buildTask34VisualPlan,
  buildTask3LockedContent,
  buildTask4LockedContent,
  pickTask5ScenePair,
  type Task34GenerationScript,
} from "../../../../lib/speaking-image-style";
import { buildTask4AuthoringPrompt } from "../../../../lib/speaking-task34-generation";
import {
  assembleTask5Content,
  generateValidatedTask5Images,
} from "../../../../lib/speaking-task5-image";
import {
  findPairedSpeakingTask4,
  parseSpeakingTaskContent,
  type SpeakingTaskContent,
} from "../../../../lib/speaking-task-pairs";

const client = new Anthropic();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const difficultyInstructions: Record<string, string> = {
  easy: "Use simple vocabulary. Predictions should be obvious next steps for each chosen activity.",
  medium: "Use natural spoken English. Link each prediction to what that group is doing now.",
  hard: "Include one prediction that connects two different activities in the same picture.",
};

function generationSeed() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function uploadImage(base64: string, filename: string): Promise<string | null> {
  try {
    const buffer = Buffer.from(base64, "base64");
    const { error } = await supabase.storage
      .from("task-images")
      .upload(filename, buffer, { contentType: "image/png", upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("task-images").getPublicUrl(filename);
    return data.publicUrl;
  } catch (error) {
    return null;
  }
}

function buildPredictionBriefFromContent(content: SpeakingTaskContent): string {
  const hooks = content.generation_script?.prediction_hooks;
  if (Array.isArray(hooks) && hooks.length > 0) {
    return hooks
      .map((h, i) => {
        const id = h.id ?? i + 1;
        const subject = h.subject || "Activity";
        const now = h.visible_now || "visible in the picture";
        const predict = h.prediction_prompt || "what happens next";
        return `${id}. ${subject} — now: ${now}. Predict: ${predict}`;
      })
      .join("\n");
  }
  const focal = content.describe_focus || content.generation_script?.focal_points || [];
  return focal.map((p, i) => `${i + 1}. ${p} — Predict what happens next.`).join("\n");
}

async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pairType, difficulty } = body;
    const chosen = body?.chosenCandidate as
      | undefined
      | {
          image_url: string;
          stability_prompt?: string;
          stability_seed?: number;
          scene_setting?: string;
          scene_planned_by?: "llm" | "fallback" | "curated";
          llm_scene_plan?: unknown;
        };
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const warnings: string[] = [];

    async function genAndUpload(
      prompt: string,
      filename: string,
      taskNum: 3 | 5,
      label: string,
      options?: { rawPrompt?: boolean; seed?: number },
    ): Promise<{ url: string | null; base64?: string }> {
      const gen = await generateSpeakingImage(prompt, taskNum, options);
      if (!gen.ok) {
        console.error(`[speaking generate-pair] ${label}:`, gen.error);
        warnings.push(`${label}: ${gen.error}`);
        return { url: null };
      }
      const url = await uploadImage(gen.base64, filename);
      if (!url) warnings.push(`${label}: upload to Supabase failed.`);
      return { url, base64: gen.base64 };
    }

    if (pairType === "3+4") {
      const difficultyInstruction =
        difficultyInstructions[difficulty] || difficultyInstructions.medium;

      const useChosen = Boolean(chosen?.image_url);
      if (useChosen) {
        console.log("Saving chosen Task 3/4 candidate image (batch selection)");
      } else {
        console.log("Generating ONE square snapshot (Task 3/4)");
      }

      const imageGen = useChosen ? null : await generateValidatedTask34Image();
      if (!useChosen && (!imageGen || !imageGen.ok)) {
        const err = imageGen && !imageGen.ok ? imageGen.error : "Task 3+4 image generation failed";
        warnings.push(`Task 3+4 image: ${err}`);
        return NextResponse.json({ error: err, warnings }, { status: 500 });
      }

      const generated = imageGen && imageGen.ok ? imageGen : null;
      const scene = generated?.scene;

      const stabilityPrompt = useChosen
        ? String(chosen?.stability_prompt || "")
        : String(generated?.stabilityPrompt || "");
      const stabilitySeed = useChosen
        ? Number(chosen?.stability_seed || 0)
        : Number(generated?.stabilitySeed || 0);

      const imageUrl = useChosen
        ? String(chosen!.image_url)
        : await uploadImage(generated!.base64, `task34_${Date.now()}.png`);
      if (!imageUrl) {
        warnings.push("Task 3+4: image upload failed. Check the task-images bucket.");
        return NextResponse.json(
          { error: "Task 3+4 image upload failed", warnings },
          { status: 500 },
        );
      }

      const imageBase64 = useChosen ? await fetchImageBase64(imageUrl) : generated!.base64;
      if (!imageBase64) {
        return NextResponse.json(
          { error: "Task 3+4 image: could not fetch image data", warnings },
          { status: 500 },
        );
      }

      console.log("Image ready:", imageUrl);

      // If the chosen candidate didn't include a scene profile, fall back to using vision alignment only.
      const fallbackScene = scene ?? {
        setting: chosen?.scene_setting || "One public place",
        focalPoints: [],
        predictionHooks: [],
        backgroundHint: "",
      };

      const visualPlan = buildTask34VisualPlan(fallbackScene);
      const predictionBrief = buildTask34PredictionBrief(fallbackScene);

      const task4UserPrompt = buildTask4AuthoringPrompt({
        task3Situation: fallbackScene.setting,
        focalPoints: fallbackScene.focalPoints,
        predictionBrief,
        pictureContext: visualPlan,
        difficulty,
        difficultyInstruction,
      });

      const [aligned, task4Sample, task4Response] = await Promise.all([
        imageBase64
          ? alignTask34ContentToImage(imageBase64, fallbackScene.focalPoints)
          : Promise.resolve(null),
        imageBase64
          ? alignTask4SampleToImage(imageBase64, fallbackScene.focalPoints)
          : Promise.resolve(null),
        client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1400,
          temperature: 0.75,
          system:
            "You are a CELPIP examiner. Return raw JSON only. Do not use markdown, backticks, or placeholder text.",
          messages: [{ role: "user", content: task4UserPrompt }],
        }),
      ]);

      const focalPoints =
        aligned?.focal_points?.length && aligned.focal_points.length >= 3
          ? aligned.focal_points
          : fallbackScene.focalPoints;

      if (aligned && aligned.focal_points.length < 3) {
        warnings.push(
          `Task 3+4: vision saw only ${aligned.focal_points.length} separate activities; using planned script for describe/predict.`,
        );
      }

      const generationScript: Task34GenerationScript = {
        requirement: SPEAKING_TASK34_REQUIREMENT.summary,
        scene_setting: fallbackScene.setting,
        focal_points: focalPoints,
        prediction_hooks: fallbackScene.predictionHooks,
        visual_plan: visualPlan,
        stability_prompt: stabilityPrompt,
        stability_seed: stabilitySeed || undefined,
        vision_description: aligned?.visual_description,
        task4_llm_prompt: task4UserPrompt,
        llm_scene_plan: (useChosen ? (chosen?.llm_scene_plan as any) : (generated?.scenePlan as any)) ?? undefined,
        scene_planned_by: (useChosen ? chosen?.scene_planned_by : generated?.scenePlannedBy) ?? undefined,
      };

      const task3: Record<string, unknown> = {
        ...buildTask3LockedContent(fallbackScene as any),
        situation: aligned?.situation ?? fallbackScene.setting,
        describe_focus: focalPoints,
        visual_description: aligned?.visual_description ?? visualPlan,
        image_prompt: aligned?.visual_description ?? visualPlan,
        sample_answer: aligned?.sample_answer ?? "",
        sample_answer_band: aligned?.sample_answer_band ?? 9,
        sample_answer_notes: aligned
          ? [
              "Describes the generated image (vision-aligned)",
              "Covers 5 purposeful activities in one simple scene",
            ]
          : ["Vision alignment failed — regenerate if text does not match the picture"],
        image_url: imageUrl,
        scene_profile: fallbackScene.setting,
        image_grounded: Boolean(aligned),
        generation_script: generationScript,
      };

      if (!aligned) {
        warnings.push(
          "Task 3+4: could not align text to image; situation and sample answer may not match the picture.",
        );
      }

      const block4 = task4Response.content[0];
      const text4 = block4.type === "text" ? block4.text : "";
      let task4Llm: Record<string, unknown>;
      try {
        task4Llm = JSON.parse(
          text4.replace(/```json/g, "").replace(/```/g, "").trim(),
        );
      } catch (parseError) {
        console.error("Task 4 JSON parse error:", parseError, text4.slice(0, 200));
        warnings.push("Task 4: LLM returned invalid JSON — using locked defaults.");
        task4Llm = {};
      }

      const task4Locked = buildTask4LockedContent();
      const task4: Record<string, unknown> = {
        ...task4Locked,
        ...task4Llm,
        prompt: task4Locked.prompt,
        image_url: imageUrl,
        scene_profile: fallbackScene.setting,
        image_grounded: Boolean(aligned),
        describe_focus: focalPoints,
        prediction_hooks: fallbackScene.predictionHooks,
        generation_script: generationScript,
      };

      if (task4Sample) {
        task4.sample_answer = task4Sample.sample_answer;
        task4.sample_answer_band = task4Sample.sample_answer_band;
        task4.sample_answer_notes = [
          "Predictions grounded in the generated image (vision)",
          "Covers 2–3 different visible activities",
        ];
      } else {
        warnings.push(
          "Task 4: could not align sample answer to the picture — regenerate if it looks wrong.",
        );
      }

      // Create task group
      const { data: group, error: groupError } = await supabaseUser
        .from("task_groups")
        .insert({
          group_type: "3+4",
          shared_image_url: imageUrl
        })
        .select()
        .single();

      if (groupError) {
        console.error("Group error:", groupError);
      }

      // Save both tasks
      
      await supabaseUser.from("admin_tasks").insert([
        {
          task_type: "Speaking Task 3",
          difficulty,
          title:
            (typeof task3.situation === "string" ? task3.situation.slice(0, 80) : null) ||
            "Speaking Task 3",
          content: task3,
          section: "Speaking",
          sequence_number: 3,
          task_group_id: group?.id
        },
        {
          task_type: "Speaking Task 4",
          difficulty,
          title:
            (typeof task4.situation === "string" ? task4.situation.slice(0, 80) : null) ||
            "Speaking Task 4",
          content: task4,
          section: "Speaking",
          sequence_number: 4,
          task_group_id: group?.id
        }
      ]);

      return NextResponse.json({
        success: true,
        message: warnings.length
          ? "Task 3+4 saved with warnings."
          : "Task 3+4 pair generated with shared image!",
        group_id: group?.id,
        image_url: imageUrl,
        scene: fallbackScene.setting,
        warnings,
      });

    } else if (pairType === "5+6") {
      const pair = pickTask5ScenePair();
      console.log("Generating Task 5+6 for theme:", pair.theme);

      const imageGen = await generateValidatedTask5Images(pair);
      if (!imageGen.ok) {
        warnings.push(`Task 5+6 images: ${imageGen.error}`);
        return NextResponse.json({ error: imageGen.error, warnings }, { status: 500 });
      }

      if (imageGen.validationWarning) {
        warnings.push(`Task 5 images: ${imageGen.validationWarning}`);
      }

      const [imageUrl1, imageUrl2] = await Promise.all([
        uploadImage(imageGen.sideA.base64, `task56_1_${Date.now()}.png`),
        uploadImage(
          imageGen.sideB.base64,
          `task56_2_${Date.now() + 1}.png`,
        ),
      ]);

      if (!imageUrl1 || !imageUrl2) {
        warnings.push("Task 5+6: one or both image uploads failed.");
        return NextResponse.json(
          { error: "Task 5+6 image upload failed", warnings },
          { status: 500 },
        );
      }

      const task5 = assembleTask5Content(pair, { a: imageUrl1, b: imageUrl2 }, imageGen) as ReturnType<
        typeof assembleTask5Content
      > & {
        sample_answer?: Task5SampleAnswerResult;
        sample_answer_band?: number;
      };

      const task6UserPrompt = `Generate a CELPIP Speaking Task 6 (Deal with a Situation) that is DIRECTLY related to these two option scenes:
          Theme: ${pair.theme}
          Situation context: ${pair.situation}
          Image 1 (option A — ${task5.option_a.label}): "${task5.option_a.image_prompt}"
          Image 2 (option B — ${task5.option_b.label}): "${task5.option_b.image_prompt}"

          The user just compared these two objective options in Task 5. Now present a situation involving one of these places/products.
          Return JSON with:
          {
            "task_number": 6,
            "task_type": "Deal with a Situation",
            "situation": "a specific situation from one of the image scenes",
            "prompt": "what would you do in this situation?",
            "preparation_time_seconds": 30,
            "speaking_time_seconds": 60,
            "tips": ["tip1", "tip2", "tip3"],
            "sample_answer": "band 9 sample answer",
            "sample_answer_band": 9,
            "sample_answer_notes": ["note1", "note2"]
          }`;

      const [sampleAnswer, task6Response] = await Promise.all([
        alignTask5SampleAnswerFromImages(
          imageGen.sideA.base64,
          imageGen.sideB.base64,
          {
            person_to_persuade: task5.person_to_persuade,
            prompt: task5.prompt,
            option_a: task5.option_a,
            option_b: task5.option_b,
          },
        ),
        client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: "You are a CELPIP examiner. Return raw JSON only.",
          messages: [{ role: "user", content: task6UserPrompt }],
        }),
      ]);

      if (sampleAnswer) {
        task5.sample_answer = sampleAnswer;
        task5.sample_answer_band = sampleAnswer.band;
      } else {
        warnings.push("Task 5: could not generate sample answer from the actual pictures.");
      }

      const block6 = task6Response.content[0];
      const text6 = block6.type === "text" ? block6.text : "";
      let task6: Record<string, unknown>;
      try {
        task6 = JSON.parse(text6.replace(/```json/g, "").replace(/```/g, "").trim());
      } catch {
        warnings.push("Task 6: LLM returned invalid JSON.");
        task6 = { task_number: 6, task_type: "Deal with a Situation" };
      }

      task6.image_url_1 = imageUrl1;
      task6.image_url_2 = imageUrl2;

      // Create task group
      const { data: group } = await supabaseUser
        .from("task_groups")
        .insert({
          group_type: "5+6",
          shared_image_url: imageUrl1,
          shared_image_url_2: imageUrl2
        })
        .select()
        .single();

      // Save both tasks
      await supabaseUser.from("admin_tasks").insert([
        {
          task_type: "Speaking Task 5",
          difficulty,
          title:
            (typeof task5.situation === "string" ? task5.situation.slice(0, 80) : null) ||
            "Speaking Task 5",
          content: task5,
          section: "Speaking",
          sequence_number: 5,
          task_group_id: group?.id
        },
        {
          task_type: "Speaking Task 6",
          difficulty,
          title:
            (typeof task6.situation === "string" ? task6.situation.slice(0, 80) : null) ||
            "Speaking Task 6",
          content: task6,
          section: "Speaking",
          sequence_number: 6,
          task_group_id: group?.id
        }
      ]);

      return NextResponse.json({
        success: true,
        message: warnings.length
          ? "Task 5+6 saved with image warnings."
          : "Task 5+6 pair generated with shared images!",
        group_id: group?.id,
        warnings,
      });
    }

    if (pairType === "3+4-repair") {
      const { task3Id } = body as { task3Id?: string };
      if (!task3Id) {
        return NextResponse.json({ error: "task3Id is required." }, { status: 400 });
      }

      const { data: task3Row, error: loadErr } = await supabaseUser
        .from("admin_tasks")
        .select("id, task_type, title, difficulty, task_group_id, content")
        .eq("id", task3Id)
        .single();

      if (loadErr || !task3Row) {
        return NextResponse.json({ error: "Speaking Task 3 not found." }, { status: 404 });
      }
      if (task3Row.task_type !== "Speaking Task 3") {
        return NextResponse.json({ error: "Only Speaking Task 3 can be repaired." }, { status: 400 });
      }

      const { data: speakingPool } = await supabaseUser
        .from("admin_tasks")
        .select("id, task_type, title, task_group_id, content")
        .ilike("task_type", "Speaking%");

      if (findPairedSpeakingTask4(task3Row, speakingPool || [])) {
        return NextResponse.json({ error: "This Task 3 already has a paired Task 4." }, { status: 400 });
      }

      const content = parseSpeakingTaskContent(task3Row.content);
      const imageUrl = content?.image_url;
      if (!imageUrl) {
        return NextResponse.json(
          { error: "Task 3 has no picture. Generate a new Task 3+4 pair instead." },
          { status: 400 },
        );
      }

      const taskDifficulty =
        (task3Row.difficulty as string | undefined) || difficulty || "medium";
      const difficultyInstruction =
        difficultyInstructions[taskDifficulty] || difficultyInstructions.medium;
      const focalPoints =
        content.describe_focus || content.generation_script?.focal_points || [];
      const situation =
        content.situation ||
        content.generation_script?.scene_setting ||
        task3Row.title ||
        "Describe the picture";
      const pictureContext =
        content.visual_description || content.image_prompt || situation;
      const predictionBrief = buildPredictionBriefFromContent(content);
      const imageBase64 = await fetchImageBase64(imageUrl);

      const task4UserPrompt = buildTask4AuthoringPrompt({
        task3Situation: situation,
        focalPoints: Array.isArray(focalPoints) ? focalPoints : [],
        predictionBrief: predictionBrief || "Predict next steps for three visible activities.",
        pictureContext,
        difficulty: taskDifficulty,
        difficultyInstruction,
      });

      const [task4Sample, task4Response] = await Promise.all([
        imageBase64
          ? alignTask4SampleToImage(imageBase64, Array.isArray(focalPoints) ? focalPoints : [])
          : Promise.resolve(null),
        client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1400,
          temperature: 0.75,
          system:
            "You are a CELPIP examiner. Return raw JSON only. Do not use markdown, backticks, or placeholder text.",
          messages: [{ role: "user", content: task4UserPrompt }],
        }),
      ]);

      const block4 = task4Response.content[0];
      const text4 = block4.type === "text" ? block4.text : "";
      let task4Llm: Record<string, unknown>;
      try {
        task4Llm = JSON.parse(text4.replace(/```json/g, "").replace(/```/g, "").trim());
      } catch {
        warnings.push("Task 4: LLM returned invalid JSON — using locked defaults.");
        task4Llm = {};
      }

      const task4Locked = buildTask4LockedContent();
      const task4: Record<string, unknown> = {
        ...task4Locked,
        ...task4Llm,
        prompt: task4Locked.prompt,
        image_url: imageUrl,
        scene_profile: content.scene_profile || situation,
        image_grounded: Boolean(content.image_grounded),
        describe_focus: focalPoints,
        generation_script: content.generation_script,
      };

      if (task4Sample) {
        task4.sample_answer = task4Sample.sample_answer;
        task4.sample_answer_band = task4Sample.sample_answer_band;
        task4.sample_answer_notes = [
          "Predictions grounded in the Task 3 picture (vision)",
          "Covers 2–3 different visible activities",
        ];
      } else {
        warnings.push(
          "Task 4: could not align sample answer to the picture — regenerate if it looks wrong.",
        );
      }

      const { data: group, error: groupError } = await supabaseUser
        .from("task_groups")
        .insert({ group_type: "3+4", shared_image_url: imageUrl })
        .select()
        .single();

      if (groupError) {
        console.error("Group error:", groupError);
        warnings.push("Could not create task group — pair linked by shared image only.");
      }

      if (group?.id) {
        await supabaseUser
          .from("admin_tasks")
          .update({ task_group_id: group.id })
          .eq("id", task3Row.id);
      }

      const { data: inserted, error: insertErr } = await supabaseUser
        .from("admin_tasks")
        .insert({
          task_type: "Speaking Task 4",
          difficulty: taskDifficulty,
          title:
            (typeof task4.situation === "string" ? task4.situation.slice(0, 80) : null) ||
            "Speaking Task 4",
          content: task4,
          section: "Speaking",
          sequence_number: 4,
          task_group_id: group?.id ?? null,
        })
        .select("id")
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message, warnings }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: warnings.length
          ? "Paired Task 4 created with warnings."
          : "Paired Task 4 created for this Task 3.",
        task3_id: task3Row.id,
        task4_id: inserted?.id,
        group_id: group?.id,
        warnings,
      });
    }

    return NextResponse.json({ error: "Invalid pair type" }, { status: 400 });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}