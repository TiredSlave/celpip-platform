import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get("audio") as Blob;
    const taskPrompt = formData.get("taskPrompt") as string;
    const taskNumber = formData.get("taskNumber") as string;

    if (!audioBlob) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    // Transcribe with Google STT
    console.log("Transcribing...");
    const audioBuffer = await audioBlob.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    const sttRes = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            encoding: "WEBM_OPUS",
            sampleRateHertz: 48000,
            languageCode: "en-CA",
            enableAutomaticPunctuation: true,
            model: "latest_long",
            useEnhanced: true,
          },
          audio: { content: base64Audio.trim() }
        })
      }
    );

    if (!sttRes.ok) {
      const err = await sttRes.text();
      console.error("STT error:", err);
      return NextResponse.json({ error: "Transcription failed: " + err }, { status: 500 });
    }

    const sttData = await sttRes.json();
    const transcript = sttData.results
      ?.map((r: any) => r.alternatives[0]?.transcript)
      .filter(Boolean).join(" ").trim() || "";

    console.log("Transcript:", transcript);

    if (!transcript) {
      return NextResponse.json({ 
        transcript: "",
        evaluation: {
          overall_band: 1,
          subscores: { coherence: 1, vocabulary: 1, grammar: 1, pronunciation_fluency: 1 },
          strengths: [],
          areas_to_improve: ["No speech was detected in your recording"],
          detailed_feedback: "No speech was detected. Please ensure your microphone is working and try again.",
          sample_improved_response: ""
        }
      });
    }

    // Evaluate with Claude
    console.log("Evaluating...");
    const evalRes = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: "You are a certified CELPIP Speaking examiner. Evaluate using bands 1-12. Return raw JSON only. No markdown. No backticks.",
      messages: [{
        role: "user",
        content: `Evaluate this CELPIP Speaking Task ${taskNumber} response.
Task: ${taskPrompt}
Transcript: "${transcript}"
Return JSON:
{
  "overall_band": 7,
  "subscores": { "coherence": 7, "vocabulary": 7, "grammar": 7, "pronunciation_fluency": 7 },
  "strengths": ["strength 1", "strength 2"],
  "areas_to_improve": ["area 1", "area 2"],
  "detailed_feedback": "2-3 sentences of feedback",
  "sample_improved_response": "improved version of their response"
}`
      }]
    });

    const evalText = evalRes.content[0].type === "text" ? evalRes.content[0].text : "";
    const evaluation = JSON.parse(evalText.replace(/```json/g,"").replace(/```/g,"").trim());

    return NextResponse.json({ transcript, evaluation });

  } catch (error) {
    console.error("Evaluate error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
