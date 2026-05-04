import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

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
              text: prompt + ", realistic photo, high quality, natural lighting",
              weight: 1
            }
          ],
          cfg_scale: 7,
          height: 512,
          width: 768,
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
    const base64 = data.artifacts[0].base64;
    return `data:image/png;base64,${base64}`;

  } catch (error) {
    console.error("Image generation error:", error);
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
            "tips": ["tip 1", "tip 2", "tip 3"]
            ${needsImage ? ',"image_prompt": "detailed realistic scene description for image generation"' : ""}
            ${taskNumber === 5 ? ',"image_prompt_2": "second different scene description for comparison"' : ""}
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

    // Generate images for tasks 3 and 5
    if (needsImage) {
      console.log("Generating image(s) with Stability AI...");

      if (taskNumber === 3 && task.image_prompt) {
        task.image_url = await generateImage(task.image_prompt);
      }

      if (taskNumber === 5) {
        const [img1, img2] = await Promise.all([
          generateImage(task.image_prompt || "busy urban scene"),
          generateImage(task.image_prompt_2 || "quiet rural scene")
        ]);
        task.image_url_1 = img1;
        task.image_url_2 = img2;
      }
    }

    return NextResponse.json(task);

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}