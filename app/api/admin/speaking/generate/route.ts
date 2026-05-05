import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function generateImage(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.STABILITY_API_KEY}`,
          "Accept": "image/*"
        },
        body: (() => {
          const fd = new FormData();
          fd.append("prompt", prompt + ", realistic photo, high quality, natural lighting, everyday Canadian scene");
          fd.append("negative_prompt", "blurry, distorted, text, watermark, nsfw");
          fd.append("output_format", "png");
          fd.append("aspect_ratio", "16:9");
          return fd;
        })()
      }
    );

    if (!response.ok) {
      console.error("Stability AI error:", await response.text());
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");

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
    const needsImage = taskNumber === 3 || taskNumber === 5 || taskNumber === 8;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a certified CELPIP examiner. Generate realistic
               CELPIP Speaking test tasks. Return raw JSON only.
               No markdown. No backticks. No explanation.`,
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
            "preparation_time_seconds": ${[1,3,4,7,8].includes(taskNumber) ? 30 : 60},
            "speaking_time_seconds": ${[1,7].includes(taskNumber) ? 90 : 60},
            "tips": ["tip 1", "tip 2", "tip 3"],
            "sample_answer": "a complete band 9 spoken response",
            "sample_answer_band": 9,
            "sample_answer_notes": ["note 1", "note 2", "note 3"]
            ${needsImage ? ',"image_prompt": "detailed realistic everyday Canadian scene for image generation"' : ""}
            ${taskNumber === 5 ? ',"image_prompt_2": "second different everyday Canadian scene for comparison"' : ""}
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

      if ((taskNumber === 3 || taskNumber === 8) && task.image_prompt) {
        const base64 = await generateImage(task.image_prompt);
        if (base64) {
          const filename = `task_img_${Date.now()}.png`;
          task.image_url = await uploadImageToSupabase(base64, filename);
        }
      }

      if (taskNumber === 5) {
        const [base64_1, base64_2] = await Promise.all([
          generateImage(task.image_prompt || "busy urban scene in Canada"),
          generateImage(task.image_prompt_2 || "quiet rural scene in Canada")
        ]);

        if (base64_1) {
          const filename1 = `task5_1_${Date.now()}.png`;
          task.image_url_1 = await uploadImageToSupabase(base64_1, filename1);
        }
        if (base64_2) {
          const filename2 = `task5_2_${Date.now() + 1}.png`;
          task.image_url_2 = await uploadImageToSupabase(base64_2, filename2);
        }
      }
    }

    return NextResponse.json(task);

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}