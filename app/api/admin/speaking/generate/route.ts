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
  6: "Dealing with a Difficult Situation",
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

function getTaskPrompt(taskNumber: number): string {
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

  // All other tasks use the original prompt format
  if (taskNumber === 5) {
    return `Generate a CELPIP Speaking Task 5 (Compare Two Pictures).

This task presents TWO images showing different everyday Canadian scenes.
The speaker must compare them and express a preference with reasons.

Generate TWO distinct, visually rich everyday Canadian scenes that have clear differences worth comparing (e.g. busy vs quiet, indoor vs outdoor, modern vs traditional, city vs nature).

Return ONLY raw JSON with this exact structure:
{
  "task_number": 5,
  "task_type": "Compare Two Pictures",
  "situation": "You will be shown two pictures. Compare the two pictures and discuss which situation you would prefer and why.",
  "prompt": "Compare these two pictures. Talk about what you see in each picture, discuss the similarities and differences, and explain which situation you would prefer and why.",
  "image_prompt": "First scene: a detailed, realistic everyday Canadian situation. Be specific — e.g. a busy downtown Toronto farmers market on a Saturday morning with vendors and shoppers",
  "image_prompt_2": "Second scene: a contrasting everyday Canadian situation. Be specific — e.g. a quiet lakeside cottage in Ontario on a summer afternoon with a family relaxing on the dock",
  "preparation_time_seconds": 60,
  "speaking_time_seconds": 60,
  "comparison_points": [
    "Describe what you see in Picture 1",
    "Describe what you see in Picture 2",
    "Compare the atmosphere or mood of both pictures",
    "Discuss one similarity between the two scenes",
    "State which you prefer and give at least two reasons"
  ],
  "tips": [
    "Start by briefly describing each picture before comparing them",
    "Use comparison language: whereas, on the other hand, in contrast, similarly",
    "Always state a clear preference — do not say I like both equally",
    "Support your preference with at least 2 specific reasons",
    "Speak for the full 60 seconds — pace yourself and add detail"
  ],
  "scoring_criteria": {
    "task_fulfillment": "Did you describe both pictures, compare them, state a preference, and speak for 60 seconds?",
    "vocabulary": "Did you use varied comparison language and descriptive vocabulary?",
    "coherence": "Was your response organized — describe, compare, prefer, explain?",
    "fluency_and_pronunciation": "Was your speech natural, clear, and easy to follow?"
  },
  "sample_answer": {
    "response": "A full natural spoken band 9 response of approximately 130-150 words. Must describe both images, compare them, and state a clear preference with reasons. Sound conversational.",
    "band": 9,
    "analysis": {
      "picture_1_description": "How the speaker described the first image",
      "picture_2_description": "How the speaker described the second image",
      "comparison": "How the speaker compared the two images",
      "preference": "Which picture was chosen and why",
      "language_used": "Notable comparison phrases or vocabulary used"
    }
  }
}`;
  }

  const needsImage = taskNumber === 3 || taskNumber === 5;
  return `Generate a CELPIP Speaking Task ${taskNumber}.

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
}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskNumber = body.taskNumber || 1;
    const needsImage = taskNumber === 3 || taskNumber === 5;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: `You are a certified CELPIP examiner. Generate realistic CELPIP Speaking test tasks. Return raw JSON only. No markdown. No backticks. No explanation.`,
      messages: [
        {
          role: "user",
          content: getTaskPrompt(taskNumber)
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

    // Generate and upload images for tasks 3 and 5 only
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