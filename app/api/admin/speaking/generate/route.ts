import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSpeakingImage } from "../../../../lib/speaking-image-generate";
import {
  generateValidatedTask34Image,
  SPEAKING_TASK34_REQUIREMENT,
} from "../../../../lib/speaking-task34-image";
import { SPEAKING_TASK3_LEARNER_PROMPT } from "../../../../lib/speaking-task34-requirement";
import {
  assembleTask5Content,
  generateValidatedTask5Images,
} from "../../../../lib/speaking-task5-image";
import {
  assembleTask8Content,
  generateValidatedTask8Image,
} from "../../../../lib/speaking-task8-image";
import { regenerateSampleAnswerForTaskWithImage } from "../../../../lib/speaking-sample-answer";
import {
  alignTask34ContentToImage,
  alignTask5SampleAnswerFromImages,
} from "../../../../lib/speaking-image-vision";
import {
  buildStabilityImagePrompt,
  buildTask34StabilityPrompt,
  buildTask34VisualPlan,
  buildTask3LockedContent,
  type Task34GenerationScript,
  buildTask5LockedContent,
  buildTask5StabilityPrompt,
  buildTask8LockedContent,
  pickTask34Scene,
  pickTask34Variation,
  pickTask5ScenePair,
  pickTask8Scene,
  randomStabilitySeed,
  SPEAKING_IMAGE_PROMPT_EXAMPLE,
  SPEAKING_IMAGE_PROMPT_GUIDANCE,
  SPEAKING_TASK34_IMAGE_GUIDANCE,
  SPEAKING_TASK5_IMAGE_GUIDANCE,
  type Task34SceneProfile,
  type Task5ScenePair,
  type Task8SceneProfile,
} from "../../../../lib/speaking-image-style";

const client = new Anthropic();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const taskDescriptions: Record<number, string> = {
  1: "Give advice to a friend about a situation",
  2: "Talk about a personal experience",
  3: "Describe a picture or scene in detail",
  4: "Make predictions about a situation",
  5: "Choose one picture and persuade",
  6: "Dealing with a Difficult Situation",
  7: "Express your opinion on a topic",
  8: "Describe an unusual situation"
};

function generationSeed() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function uploadImageToSupabase(
  base64: string,
  filename: string
): Promise<string | null> {
  try {
    const buffer = Buffer.from(base64, "base64");

    const { error } = await supabase.storage
      .from("task-images")
      .upload(filename, buffer, {
        contentType: "image/png",
        upsert: true
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("task-images")
      .getPublicUrl(filename);

    console.log("Image uploaded to Supabase:", urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
}

function getTaskPrompt(
  taskNumber: number,
  options?: { task8Scene?: Task8SceneProfile; task34Scene?: Task34SceneProfile },
): string {
  // Task 6 gets its own detailed prompt
  if (taskNumber === 6) {
    return `Generate a CELPIP Speaking Task 6 (Dealing with a Difficult Situation).

This task is COMPLETELY INDEPENDENT — do NOT reference any images, previous tasks, or comparisons.

The scenario must:
- Present a realistic everyday Canadian life situation (workplace, housing, social, family, or service)
- Require the speaker to deliver bad news, deny a request, or resolve a conflict diplomatically
- Offer exactly TWO people the speaker can choose to address
- Require tact, empathy, and clear communication to handle properly

Return ONLY raw JSON with this exact structure:
{
  "task_number": 6,
  "task_type": "Dealing with a Difficult Situation",
  "situation": "2-3 sentences describing the scenario clearly. Example: You are a shift supervisor at a coffee shop. One of your part-time employees, Jamie, has been requesting weekends off every week, but the shop is busiest on weekends and you cannot accommodate this anymore. Jamie is also a good friend of yours outside of work.",
  "option_a": {
    "person": "Full name and role of first person",
    "instruction": "Specific instruction on what the speaker must communicate to this person"
  },
  "option_b": {
    "person": "Full name and role of second person",
    "instruction": "Specific instruction on what the speaker must communicate to this person"
  },
  "preparation_time_seconds": 60,
  "speaking_time_seconds": 60,
  "tips": [
    "Choose the option you feel most confident speaking about — both are equally valid",
    "Use the Sandwich Method: acknowledge feelings first → deliver the difficult news → offer a solution or next step",
    "Use soft modal verbs: would, could, might — avoid direct phrases like you must or you have to",
    "Remember: more words = more polite in English. Avoid being too brief or blunt",
    "Open with a warm, friendly tone before delivering the difficult message"
  ],
  "scoring_criteria": {
    "task_fulfillment": "Did you clearly address the situation and speak for the full 60 seconds?",
    "tone_and_diplomacy": "Was your language polite, empathetic, and appropriate for the relationship?",
    "vocabulary": "Did you use varied vocabulary including soft modals and polite expressions?",
    "coherence": "Was your response logically organized with a clear opening, middle, and resolution?",
    "fluency_and_pronunciation": "Was your speech natural, clear, and easy to follow?"
  },
  "sample_answer": {
    "chosen_option": "A",
    "response": "A full natural spoken band 9 response of approximately 130-150 words using the sandwich method. Must sound conversational, not written.",
    "band": 9,
    "analysis": {
      "opening": "How the speaker opened with warmth",
      "validation": "How the speaker acknowledged the other person's feelings",
      "bad_news": "How the difficult message was delivered diplomatically",
      "solution": "What solution or next step was offered",
      "closing": "How the speaker ended positively"
    }
  }
}`;
  }

  if (taskNumber === 3) {
    const scene = options?.task34Scene ?? pickTask34Scene();
    const seed = generationSeed();
    const plan = buildTask34VisualPlan(scene);
    return `Generate CELPIP Speaking Task 3 (Describe a Picture) content for internal authoring.
The saved task must use this exact learner prompt (copy verbatim into JSON "prompt"):
"${SPEAKING_TASK3_LEARNER_PROMPT}"

Variation seed: ${seed}
Scene: ${scene.setting}

Activities in the picture (for sample_answer only — not for the learner prompt):
${scene.focalPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

${SPEAKING_TASK34_IMAGE_GUIDANCE}

Return ONLY raw JSON with task_number, task_type, situation, prompt, preparation_time_seconds, speaking_time_seconds, tips, sample_answer, sample_answer_band, sample_answer_notes.`;
  }

  if (taskNumber === 5) {
    const pair = pickTask5ScenePair();
    const seed = generationSeed();
    return `Generate a CELPIP Speaking Task 5 (Choose One Picture + Persuade).

This task shows TWO pictures of objective options (apartment, car, furniture, venue, equipment, room layout).
The test taker MUST choose ONE picture (A or B) and persuade a person that this option is better.

Variation seed: ${seed}

Theme: ${pair.theme}
Picture A: ${pair.labelA}
Picture B: ${pair.labelB}
Fixed visual for A (copy verbatim into option_a.image_prompt): ${pair.promptA}
Fixed visual for B (copy verbatim into option_b.image_prompt): ${pair.promptB}

${SPEAKING_TASK5_IMAGE_GUIDANCE}

Do NOT use farmers markets / produce stalls / agriculture scenes.
Each option must be a clearly different choice type — not a social party or crowd scene.

Return ONLY raw JSON with this exact structure:
{
  "task_number": 5,
  "task_type": "Choose One Picture + Persuade",
  "situation": "One sentence: you are choosing between two options in pictures A and B.",
  "prompt": "Choose Picture A or Picture B. Describe your chosen picture in detail and persuade the person below that your choice is better. Briefly mention one reason the other option is less suitable.",
  "person_to_persuade": "a specific person and relationship, e.g. your friend / your coworker / your sibling",
  "option_a": {
    "label": "Picture A — short label",
    "image_prompt": "copy the fixed visual for A verbatim",
    "facts": ["2–5 short facts (price/rent, location, capacity, time, key advantage). Must be concrete and realistic."]
  },
  "option_b": {
    "label": "Picture B — short label",
    "image_prompt": "copy the fixed visual for B verbatim",
    "facts": ["2–5 short facts (price/rent, location, capacity, time, key advantage). Must be concrete and realistic."]
  },
  "preparation_time_seconds": 60,
  "speaking_time_seconds": 60,
  "tips": [
    "Choose A or B quickly, then spend most time describing your chosen picture",
    "Use persuasion language: I strongly recommend…, the main reason is…, another advantage is…",
    "Describe layout, objects, and features — people are optional",
    "Briefly acknowledge the other option but do not spend too long on it",
    "Give at least 2 clear reasons your choice is better for the person"
  ],
  "scoring_criteria": {
    "task_fulfillment": "Did you clearly choose A or B, describe it, persuade the person, and speak for 60 seconds?",
    "vocabulary": "Did you use varied descriptive and persuasive vocabulary?",
    "coherence": "Was your response organized — choice, description, reasons, brief contrast, conclusion?",
    "fluency_and_pronunciation": "Was your speech natural, clear, and easy to follow?"
  },
  "sample_answer": {
    "response": "A full natural spoken band 9 response of approximately 130-150 words. Must clearly choose A or B, describe the chosen picture in detail, and persuade the person with at least two reasons. Sound conversational.",
    "band": 9,
    "analysis": {
      "choice": "Which picture was chosen and why",
      "description": "Key visual details included about the chosen picture",
      "persuasion": "Main reasons used to persuade the person",
      "contrast": "One brief drawback mentioned about the other option",
      "language_used": "Notable persuasive phrases or vocabulary used"
    }
  }
}`;
  }

  if (taskNumber === 8) {
    const scene = options?.task8Scene ?? pickTask8Scene();
    const seed = generationSeed();
    return `Generate a CELPIP Speaking Task 8 (Describe an Unusual Situation) WITH a picture.

The picture MUST show an unusual but safe everyday situation (no violence, no injury, no emergency, no police, no weapons).
Do NOT use farmers markets / produce stalls / agriculture scenes.

Variation seed: ${seed}

REQUIRED core scene (build situation and sample_answer around this — do not replace with a different idea):
Title: ${scene.title}
Bizarre action: ${scene.scene}
Why it is unusual: ${scene.whyUnusual}

Picture that will be generated (describe this exactly in sample_answer):
${scene.visualFocus}

Hard rules:
- ONE obviously wrong-place / wrong-context action — not a normal everyday routine.
- Human-centered: people must be the main focus. Do NOT use dogs, cats, pets, or any animal as the main subject.
- Include surprised bystanders reacting to the bizarre action.
- Set image_prompt to the exact picture description block above (you may copy it verbatim).
- situation title should be: ${scene.title}

Return ONLY raw JSON with this exact structure:
{
  "task_number": 8,
  "task_type": "Describe an unusual situation",
  "situation": "${scene.title}",
  "prompt": "Describe what is happening in the picture. Explain why the situation is unusual and what you think happened just before this moment.",
  "preparation_time_seconds": 30,
  "speaking_time_seconds": 60,
  "tips": ["tip1", "tip2", "tip3"],
  "sample_answer": "a complete band 9 spoken response that matches this exact picture",
  "sample_answer_band": 9,
  "sample_answer_notes": ["note1", "note2", "note3"],
  "image_prompt": "copy the picture description block above"
}`;
  }

  const needsImage = taskNumber === 3 || taskNumber === 5 || taskNumber === 8;
  return `Generate a CELPIP Speaking Task ${taskNumber}.

Task type: ${taskDescriptions[taskNumber]}

${needsImage ? SPEAKING_IMAGE_PROMPT_GUIDANCE : ""}

Return JSON with exactly these keys:
{
  "task_number": ${taskNumber},
  "task_type": "${taskDescriptions[taskNumber]}",
  "situation": "the situation or context",
  "prompt": "the specific question or instruction",
  "preparation_time_seconds": 30,
  "speaking_time_seconds": 60,
  "tips": ["tip 1", "tip 2", "tip 3"],
  "sample_answer": "a complete band 9 spoken response",
  "sample_answer_band": 9,
  "sample_answer_notes": ["note 1", "note 2", "note 3"]
  ${needsImage ? `,"image_prompt": "${SPEAKING_IMAGE_PROMPT_EXAMPLE}"` : ""}
}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskNumber = body.taskNumber || 1;
    const needsImage = taskNumber === 3 || taskNumber === 5 || taskNumber === 8;
    const warnings: string[] = [];

    async function attachImage(
      prompt: string,
      filename: string,
      num: number,
      label: string,
      genOptions?: { rawPrompt?: boolean; seed?: number },
    ): Promise<string | null> {
      const gen = await generateSpeakingImage(prompt, num, genOptions);
      if (!gen.ok) {
        console.error(`[speaking generate] ${label}:`, gen.error);
        warnings.push(`${label}: ${gen.error}`);
        return null;
      }
      const url = await uploadImageToSupabase(gen.base64, filename);
      if (!url) {
        warnings.push(
          `${label}: Image generated but upload to Supabase storage failed. Check the task-images bucket.`,
        );
      }
      return url;
    }

    if (taskNumber === 3) {
      const scene = pickTask34Scene();
      const visualPlan = buildTask34VisualPlan(scene);
      const imageGen = await generateValidatedTask34Image(scene);

      if (!imageGen.ok) {
        warnings.push(`Task 3 image: ${imageGen.error}`);
        return NextResponse.json(
          { error: imageGen.error, warnings },
          { status: 500 },
        );
      }

      if (imageGen.validationWarning) {
        warnings.push(`Task 3 image: ${imageGen.validationWarning} Saved best generated image.`);
      } else if (imageGen.attempts > 1) {
        warnings.push(
          `Task 3 image: regenerated ${imageGen.attempts} times; vision counted ${imageGen.activityCount} independent activities.`,
        );
      }

      const stabilityPrompt = imageGen.stabilityPrompt;
      const stabilitySeed = imageGen.stabilitySeed;

      const aligned = await alignTask34ContentToImage(
        imageGen.base64,
        scene.focalPoints,
      );
      const focalPoints =
        aligned?.focal_points?.length && aligned.focal_points.length >= 4
          ? aligned.focal_points
          : scene.focalPoints;

      if (aligned && aligned.focal_points.length < 4) {
        warnings.push(
          `Task 3: vision saw only ${aligned.focal_points.length} separate activities in the image; text uses planned ${scene.focalPoints.length} activity script.`,
        );
      }

      const generationScript: Task34GenerationScript = {
        requirement: SPEAKING_TASK34_REQUIREMENT.summary,
        scene_setting: scene.setting,
        focal_points: focalPoints,
        prediction_hooks: scene.predictionHooks,
        visual_plan: visualPlan,
        stability_prompt: stabilityPrompt,
        stability_seed: stabilitySeed,
        vision_description: aligned?.visual_description,
      };

      const base = buildTask3LockedContent(scene);
      const task: Record<string, unknown> = aligned
        ? {
            ...base,
            situation: aligned.situation,
            describe_focus: focalPoints,
            visual_description: aligned.visual_description,
            image_prompt: aligned.visual_description,
            sample_answer: aligned.sample_answer,
            sample_answer_band: aligned.sample_answer_band,
            sample_answer_notes: [
              "Describes the generated image (vision-aligned)",
              "Covers about 4–5 purposeful activities in one simple square snapshot",
            ],
            image_grounded: true,
            scene_profile: scene.setting,
            generation_script: generationScript,
          }
        : {
            ...base,
            describe_focus: focalPoints,
            sample_answer_notes: [
              "Vision alignment failed — text may not match the picture",
            ],
            image_grounded: false,
            scene_profile: scene.setting,
            generation_script: generationScript,
          };

      if (!aligned) {
        warnings.push(
          "Task 3: could not align text to image; situation and sample answer may not match the picture.",
        );
      }

      task.image_url = await uploadImageToSupabase(
        imageGen.base64,
        `task3_${Date.now()}.png`,
      );
      if (!task.image_url) {
        warnings.push(
          "Task 3: Image generated but upload to Supabase failed. Check the task-images bucket.",
        );
      }

      return NextResponse.json({ ...task, warnings });
    }

    if (taskNumber === 5) {
      const pair = pickTask5ScenePair();
      const imageGen = await generateValidatedTask5Images(pair);

      if (!imageGen.ok) {
        warnings.push(`Task 5 images: ${imageGen.error}`);
        return NextResponse.json(
          {
            error: `${imageGen.error}. Check STABILITY_API_KEY and ANTHROPIC_API_KEY, then try again. For local dev only: SPEAKING_SKIP_TASK5_IMAGE_CHECK=true`,
            warnings,
          },
          { status: 500 },
        );
      }

      if (imageGen.validationWarning) {
        warnings.push(`Task 5 images: ${imageGen.validationWarning}`);
      }

      const [urlA, urlB] = await Promise.all([
        uploadImageToSupabase(imageGen.sideA.base64, `task5_a_${Date.now()}.png`),
        uploadImageToSupabase(imageGen.sideB.base64, `task5_b_${Date.now() + 1}.png`),
      ]);

      if (!urlA || !urlB) {
        return NextResponse.json(
          {
            error:
              "Task 5 images generated but upload to Supabase failed. Check the task-images bucket and storage permissions.",
            warnings,
          },
          { status: 500 },
        );
      }

      const task: Record<string, unknown> = assembleTask5Content(
        pair,
        { a: urlA, b: urlB },
        imageGen,
      );

      try {
        const sampleAnswer = await alignTask5SampleAnswerFromImages(
          imageGen.sideA.base64,
          imageGen.sideB.base64,
          {
            person_to_persuade: task.person_to_persuade as string | undefined,
            prompt: task.prompt as string | undefined,
            option_a: task.option_a as { label?: string; facts?: string[] },
            option_b: task.option_b as { label?: string; facts?: string[] },
          },
        );
        if (sampleAnswer) {
          task.sample_answer = sampleAnswer;
          task.sample_answer_band = sampleAnswer.band;
        } else {
          warnings.push(
            "Task 5: sample answer not generated — task saved without it; regenerate if needed.",
          );
        }
      } catch (sampleErr) {
        console.error("Task 5 sample answer error:", sampleErr);
        warnings.push("Task 5: sample answer step failed — pictures still saved.");
      }

      return NextResponse.json({ ...task, warnings });
    }

    if (taskNumber === 8) {
      const scene = pickTask8Scene();
      const imageGen = await generateValidatedTask8Image(scene);

      if (!imageGen.ok) {
        warnings.push(`Task 8 image: ${imageGen.error}`);
        return NextResponse.json(
          {
            error: `${imageGen.error} (after ${imageGen.attempts} attempts — rejected panel grids or non-absurd scenes; regenerate)`,
            warnings,
          },
          { status: 500 },
        );
      }

      const imageUrl = await uploadImageToSupabase(
        imageGen.base64,
        `task8_${Date.now()}.png`,
      );

      if (!imageUrl) {
        warnings.push(
          "Task 8: Image generated but upload to Supabase failed. Check the task-images bucket.",
        );
      }

      const task: Record<string, unknown> = {
        ...(await assembleTask8Content(scene, imageUrl, imageGen)),
      };

      if (!task.image_grounded) {
        return NextResponse.json(
          {
            error:
              "Task 8 image was rejected: panel grid or normal routine scene (not absurd enough). Regenerate.",
            warnings,
          },
          { status: 500 },
        );
      }

      if (imageGen.attempts > 1) {
        warnings.push(
          `Task 8 image: regenerated ${imageGen.attempts} times before passing quality check.`,
        );
      }

      return NextResponse.json({ ...task, warnings });
    }

    const task34Scene = taskNumber === 3 ? pickTask34Scene() : undefined;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      temperature: taskNumber === 8 ? 0.9 : 1,
      system: `You are a certified CELPIP examiner. Generate realistic CELPIP Speaking test tasks. Return raw JSON only. No markdown. No backticks. No explanation. For image_prompt fields, write a simple flat cartoon illustration like official CELPIP practice pictures — never photorealistic photography.${
        taskNumber === 8
          ? " For Task 8, follow the required bizarre wrong-context scene exactly: ONE central odd action, surprised bystanders, obviously out of place — not a normal routine. Never default to dogs, cats, or pets."
          : taskNumber === 3
            ? " For Task 3, the picture must be ONE square scene with exactly 4–5 purposeful activities — simple and uncluttered, not a crowd, not several separate scenes."
            : " For picture tasks, include 8–12 describable facts with many people and props."
      }`,
      messages: [
        {
          role: "user",
          content: getTaskPrompt(taskNumber, { task34Scene })
        }
      ]
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const task = JSON.parse(cleaned);

    if (taskNumber === 3) {
      task.prompt = SPEAKING_TASK3_LEARNER_PROMPT;
    }

    // Generate and upload images for tasks 3 and 5
    if (needsImage) {
      console.log("Generating image(s) with Stability AI v2...");

      if (taskNumber === 3 && task34Scene) {
        const visualPlan = buildTask34VisualPlan(task34Scene);
        const imageGen = await generateValidatedTask34Image(task34Scene);
        if (!imageGen.ok) {
          warnings.push(`Task 3 image: ${imageGen.error}`);
        } else {
          task.visual_description = visualPlan;
          task.image_prompt = visualPlan;
          task.situation = task.situation || task34Scene.setting;
          task.describe_focus = task34Scene.focalPoints;
          task.image_url = await uploadImageToSupabase(
            imageGen.base64,
            `task3_${Date.now()}.png`,
          );
        }
      }

      if (taskNumber === 5) {
        const pair = pickTask5ScenePair();
        const imageGen = await generateValidatedTask5Images(pair);
        if (!imageGen.ok) {
          warnings.push(`Task 5 images: ${imageGen.error}`);
        } else {
          const [urlA, urlB] = await Promise.all([
            uploadImageToSupabase(imageGen.sideA.base64, `task5_a_${Date.now()}.png`),
            uploadImageToSupabase(
              imageGen.sideB.base64,
              `task5_b_${Date.now() + 1}.png`,
            ),
          ]);
          const assembled = assembleTask5Content(pair, { a: urlA, b: urlB }, imageGen);
          Object.assign(task, assembled);
        }
      }

      const rewritten = await regenerateSampleAnswerForTaskWithImage(task);
      if (rewritten) {
        task.sample_answer = rewritten;
        if (typeof rewritten.band === "number") {
          task.sample_answer_band = rewritten.band;
        }
      }
    }

    return NextResponse.json({ ...task, warnings });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}