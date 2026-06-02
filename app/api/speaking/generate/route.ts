import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  enrichSpeakingImagePromptForTask,
  SPEAKING_IMAGE_NEGATIVE_EXTRA,
  SPEAKING_IMAGE_NEGATIVE_SPARSE,
  SPEAKING_IMAGE_PROMPT_EXAMPLE,
  SPEAKING_IMAGE_PROMPT_EXAMPLE_B,
  SPEAKING_IMAGE_PROMPT_GUIDANCE,
} from "../../../lib/speaking-image-style";

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
  5: "Compare two pictures and discuss differences",
  6: "Deal with a difficult situation",
  7: "Express your opinion on a topic",
  8: "Describe an unusual situation"
};

async function generateImage(prompt: string, taskNumber: number): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.STABILITY_API_KEY}`,
          "Accept": "application/json"
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: enrichSpeakingImagePromptForTask(taskNumber, prompt),
              weight: 1
            },
            {
              text: `blurry, distorted, text, watermark, nsfw, violence, ${SPEAKING_IMAGE_NEGATIVE_EXTRA}, ${SPEAKING_IMAGE_NEGATIVE_SPARSE}`,
              weight: -1
            }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          samples: 1,
          steps: 30
        })
      }
    );

    if (!response.ok) {
      console.error("Stability AI error:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.artifacts[0].base64;

  } catch (error) {
    console.error("Image generation error:", error);
    return null;
  }
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskNumber = body.taskNumber || 1;
    const needsImage = taskNumber === 3 || taskNumber === 5;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a certified CELPIP examiner. Generate realistic CELPIP Speaking test tasks. Return raw JSON only. No markdown. No backticks. No explanation. For image_prompt fields, describe scenes for simple flat cartoon illustrations like CELPIP exam pictures — not photographs.`,
      messages: [
        {
          role: "user",
          content: `Generate a CELPIP Speaking Task ${taskNumber}.
          Task type: ${taskDescriptions[taskNumber]}

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
            ${taskNumber === 5 ? `,"image_prompt_2": "${SPEAKING_IMAGE_PROMPT_EXAMPLE_B}"` : ""}
          }`
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

    // Generate and save images for tasks 3 and 5
    if (needsImage) {
      console.log("Generating image(s) with Stability AI...");

      if (taskNumber === 3 && task.image_prompt) {
        const base64 = await generateImage(task.image_prompt, 3);
        if (base64) {
          const filename = `task3_${Date.now()}.png`;
          task.image_url = await uploadImageToSupabase(base64, filename);
        }
      }
    }

    return NextResponse.json(task);

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}