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
              text: prompt + ", realistic photo, high quality, natural lighting, everyday Canadian scene",
              weight: 1
            },
            {
              text: "blurry, distorted, text, watermark, nsfw, violence",
              weight: -1
            }
          ],
          cfg_scale: 7,
          height: 768,
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
            "preparation_time_seconds": 30,
            "speaking_time_seconds": 60,
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

      if (taskNumber === 3 && task.image_prompt) {
        const base64 = await generateImage(task.image_prompt);
        if (base64) {
          const filename = `task3_${Date.now()}.png`;
          task.image_url = await uploadImageToSupabase(base64, filename);
        }
      }

      if (taskNumber === 5) {
    return `Generate a CELPIP Speaking Task 5 (Comparing and Persuading).

This is a two-part task:
- Part A: Test taker sees 2 options with images, has 60 seconds to choose one
- Part B: If no choice made, system assigns one. Then 60 seconds to speak persuading someone why their choice is better.

Generate a realistic Canadian scenario where someone chooses between two options.
Each option has an IMAGE and specific details (price, features, etc).

Return ONLY raw JSON:
{
  "task_number": 5,
  "task_type": "Comparing and Persuading",
  "scenario": "Brief scenario description e.g. You and a friend are choosing a gym membership.",
  "person_to_persuade": "your friend / your boss / your family member",
  "selection_time_seconds": 60,
  "speaking_time_seconds": 60,
  "option_a": {
    "label": "Option A name e.g. Downtown Fitness Club",
    "image_prompt": "Detailed realistic Canadian scene for this option",
    "details": {
      "price": "$50/month",
      "feature_1": "Olympic pool",
      "feature_2": "24/7 access",
      "feature_3": "Free parking"
    }
  },
  "option_b": {
    "label": "Option B name e.g. Community Recreation Centre",
    "image_prompt": "Detailed realistic Canadian scene for this option",
    "details": {
      "price": "$30/month",
      "feature_1": "Group fitness classes",
      "feature_2": "Weekday only",
      "feature_3": "No parking"
    }
  },
  "tips": [
    "Choose quickly — you only have 60 seconds to select",
    "Use comparative language: cheaper, more convenient, better value",
    "Acknowledge the other option politely before explaining your choice",
    "Give at least 2 specific reasons with details from the images",
    "Address your response to the person e.g. Hi [name], I know you prefer..."
  ],
  "sample_answer": {
    "chosen_option": "A",
    "response": "130-150 word natural spoken band 9 response persuading the listener. Must compare both options and give specific reasons.",
    "band": 9
  }
}`;
  }

  if (taskNumber === 5 && false) {
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