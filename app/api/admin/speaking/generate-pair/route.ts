import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateImage(prompt: string): Promise<string | null> {
  console.log("=== generateImage called ===");
  console.log("API KEY exists:", !!process.env.STABILITY_API_KEY);
  try {
    const formData = new FormData();
    formData.append("prompt", prompt + ", realistic photo, high quality, natural lighting, everyday Canadian scene");
    formData.append("negative_prompt", "blurry, distorted, text, watermark, nsfw");
    formData.append("output_format", "png");
    formData.append("aspect_ratio", "16:9");
    const response = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.STABILITY_API_KEY}`,
          "Accept": "image/*"
        },
        body: formData
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      console.error("Stability error:", errText);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (error) {
    return null;
  }
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pairType, difficulty } = body;
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    if (pairType === "3+4") {
      // Generate Task 3 content
      const task3Response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: "You are a CELPIP examiner. Return raw JSON only.",
        messages: [{
          role: "user",
          content: `Generate a CELPIP Speaking Task 3 (Describe a Picture).
          Return JSON with:
          {
            "task_number": 3,
            "task_type": "Describe a Picture",
            "situation": "context for the image",
            "prompt": "describe what you see in this image in detail",
            "preparation_time_seconds": 30,
            "speaking_time_seconds": 60,
            "tips": ["tip1", "tip2", "tip3"],
            "sample_answer": "band 9 sample answer",
            "sample_answer_band": 9,
            "sample_answer_notes": ["note1", "note2"],
            "image_prompt": "detailed scene description for image generation"
          }`
        }]
      });

      const block3 = task3Response.content[0];
      const text3 = block3.type === "text" ? block3.text : "";
      const task3 = JSON.parse(text3.replace(/```json/g, "").replace(/```/g, "").trim());

      // Generate image for Task 3
      console.log("Generating shared image...");
      const base64 = await generateImage(task3.image_prompt || "busy Canadian scene");
      let imageUrl = null;
      if (base64) {
        const filename = `task34_${Date.now()}.png`;
        imageUrl = await uploadImage(base64, filename);
        console.log("Image saved:", imageUrl);
      }

      // Generate Task 4 using SAME image context
      const task4Response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: "You are a CELPIP examiner. Return raw JSON only.",
        messages: [{
          role: "user",
          content: `Generate a CELPIP Speaking Task 4 (Make Predictions) that is DIRECTLY related to this image scene:
          "${task3.image_prompt}"
          
          The user just described this image in Task 3. Now ask them to make predictions about it.
          Return JSON with:
          {
            "task_number": 4,
            "task_type": "Make Predictions",
            "situation": "same scene as Task 3",
            "prompt": "prediction question directly about the image scene",
            "preparation_time_seconds": 30,
            "speaking_time_seconds": 60,
            "tips": ["tip1", "tip2", "tip3"],
            "sample_answer": "band 9 sample answer with predictions",
            "sample_answer_band": 9,
            "sample_answer_notes": ["note1", "note2"]
          }`
        }]
      });

      const block4 = task4Response.content[0];
      const text4 = block4.type === "text" ? block4.text : "";
      const task4 = JSON.parse(text4.replace(/```json/g, "").replace(/```/g, "").trim());

      // Add shared image URL to both tasks
      task3.image_url = imageUrl;
      task4.image_url = imageUrl;

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
          title: task3.situation?.slice(0, 80) || "Speaking Task 3",
          content: task3,
          section: "Speaking",
          sequence_number: 3,
          task_group_id: group?.id
        },
        {
          task_type: "Speaking Task 4",
          difficulty,
          title: task4.situation?.slice(0, 80) || "Speaking Task 4",
          content: task4,
          section: "Speaking",
          sequence_number: 4,
          task_group_id: group?.id
        }
      ]);

      return NextResponse.json({
        success: true,
        message: "Task 3+4 pair generated with shared image!",
        group_id: group?.id,
        image_url: imageUrl
      });

    } else if (pairType === "5+6") {
      // Generate Task 5 content
      const task5Response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: "You are a CELPIP examiner. Return raw JSON only.",
        messages: [{
          role: "user",
          content: `Generate a CELPIP Speaking Task 5 (Compare Two Pictures).
          Return JSON with:
          {
            "task_number": 5,
            "task_type": "Compare Two Pictures",
            "situation": "context for comparing two images",
            "prompt": "compare and contrast these two images",
            "preparation_time_seconds": 30,
            "speaking_time_seconds": 60,
            "tips": ["tip1", "tip2", "tip3"],
            "sample_answer": "band 9 sample answer",
            "sample_answer_band": 9,
            "sample_answer_notes": ["note1", "note2"],
            "image_prompt": "first scene description",
            "image_prompt_2": "second contrasting scene description"
          }`
        }]
      });

      const block5 = task5Response.content[0];
      const text5 = block5.type === "text" ? block5.text : "";
      const task5 = JSON.parse(text5.replace(/```json/g, "").replace(/```/g, "").trim());

      // Generate both images
      console.log("Generating two images for Task 5+6...");
      const [base64_1, base64_2] = await Promise.all([
        generateImage(task5.image_prompt || "busy urban scene"),
        generateImage(task5.image_prompt_2 || "quiet rural scene")
      ]);

      let imageUrl1 = null;
      let imageUrl2 = null;

      if (base64_1) {
        imageUrl1 = await uploadImage(base64_1, `task56_1_${Date.now()}.png`);
      }
      if (base64_2) {
        imageUrl2 = await uploadImage(base64_2, `task56_2_${Date.now() + 1}.png`);
      }

      // Generate Task 6 using SAME images
      const task6Response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: "You are a CELPIP examiner. Return raw JSON only.",
        messages: [{
          role: "user",
          content: `Generate a CELPIP Speaking Task 6 (Deal with a Situation) that is DIRECTLY related to these two image scenes:
          Image 1: "${task5.image_prompt}"
          Image 2: "${task5.image_prompt_2}"

          The user just compared these two images in Task 5. Now present a situation from one of these scenes.
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
          }`
        }]
      });

      const block6 = task6Response.content[0];
      const text6 = block6.type === "text" ? block6.text : "";
      const task6 = JSON.parse(text6.replace(/```json/g, "").replace(/```/g, "").trim());

      // Add shared image URLs
      task5.image_url_1 = imageUrl1;
      task5.image_url_2 = imageUrl2;
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
          title: task5.situation?.slice(0, 80) || "Speaking Task 5",
          content: task5,
          section: "Speaking",
          sequence_number: 5,
          task_group_id: group?.id
        },
        {
          task_type: "Speaking Task 6",
          difficulty,
          title: task6.situation?.slice(0, 80) || "Speaking Task 6",
          content: task6,
          section: "Speaking",
          sequence_number: 6,
          task_group_id: group?.id
        }
      ]);

      return NextResponse.json({
        success: true,
        message: "Task 5+6 pair generated with shared images!",
        group_id: group?.id
      });
    }

    return NextResponse.json({ error: "Invalid pair type" }, { status: 400 });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}