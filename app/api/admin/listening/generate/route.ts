import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../../../lib/supabase-admin";

const client = new Anthropic();

// Voice assignments per speaker role
const VOICES = {
  female1: "en-US-Neural2-F",
  male1:   "en-US-Neural2-D",
  female2: "en-US-Neural2-C",
  male2:   "en-US-Neural2-J",
  news:    "en-US-Neural2-J",
};

const partConfig: Record<string, {
  questions: number;
  speakers: string;
  audioLength: string;
  answerTimeSeconds: number;
  description: string;
  difficulty: string;
  vocabulary: string;
  topics: string;
  speechStyle: string;
}> = {
  "Problem Solving": {
    questions: 8,
    speakers: "2 speakers",
    audioLength: "3 segments, 45-75 seconds each",
    answerTimeSeconds: 30,
    description: "Two people discussing and solving an everyday problem",
    difficulty: "MEDIUM — moderate vocabulary, some inference required",
    vocabulary: "everyday conversational English, some idioms acceptable",
    topics: "workplace issues, scheduling conflicts, household problems, community matters",
    speechStyle: "natural back-and-forth conversation with interruptions, hesitations, and informal expressions"
  },
  "Daily Life Conversation": {
    questions: 5,
    speakers: "2 speakers",
    audioLength: "1-1.5 minutes",
    answerTimeSeconds: 30,
    description: "Short casual conversation about everyday topics",
    difficulty: "EASIEST — simple vocabulary, literal meaning, no inference needed",
    vocabulary: "basic everyday words only, no idioms, short simple sentences",
    topics: "weather, shopping, food, simple social plans, basic daily activities",
    speechStyle: "very casual and simple chat between friends or neighbours"
  },
  "Listening for Information": {
    questions: 6,
    speakers: "2 speakers",
    audioLength: "2.0-2.5 minutes",
    answerTimeSeconds: 30,
    description: "One person giving information or instructions to another",
    difficulty: "EASY-MEDIUM — clear information, mostly literal",
    vocabulary: "clear instructional language, some specific terms explained in context",
    topics: "directions, how to use a service, explaining a schedule, community program info",
    speechStyle: "one speaker explains clearly while the other asks clarifying questions"
  },
  "News Item": {
    questions: 5,
    speakers: "1 speaker (news reporter)",
    audioLength: "1.5-2 minutes",
    answerTimeSeconds: 180,
    description: "A formal news-style report on a Canadian community topic",
    difficulty: "MEDIUM — formal vocabulary, some inference, facts to remember",
    vocabulary: "formal news language, some specific nouns and statistics",
    topics: "local Canadian community news, environment, public programs, infrastructure",
    speechStyle: "professional news anchor tone, formal pacing, structured report"
  },
  "Discussion": {
    questions: 8,
    speakers: "3 speakers (Host + 2 guests)",
    audioLength: "1.5-2 minutes",
    answerTimeSeconds: 240,
    description: "Multiple people discussing different viewpoints on a topic",
    difficulty: "HARD — multiple speakers, different opinions, inference required",
    vocabulary: "wide range including abstract concepts, opinions, discourse markers",
    topics: "social issues, environment, technology, Canadian society, education",
    speechStyle: "lively debate with agreements and disagreements, Host moderates"
  },
  "Viewpoints": {
    questions: 6,
    speakers: "1-2 speakers",
    audioLength: "2.5-3 minutes",
    answerTimeSeconds: 270,
    description: "Speaker presenting and defending a viewpoint with evidence",
    difficulty: "HARDEST — complex arguments, implied meaning, requires inference",
    vocabulary: "advanced vocabulary, academic-style language, evidence and examples",
    topics: "complex social or ethical issues in Canadian context, policy debates",
    speechStyle: "confident persuasive speaker, structured argument with evidence"
  }
};

type GeneratedListeningTask = {
  listening_type?: string;
  part_description?: string;
  audio_length?: string;
  answer_time_seconds?: number;
  topic?: string;
  title?: string;
  dialogue?: { speaker: string; text: string; section?: number }[];
  questions?: unknown[];
  audio_url?: string;
};

/** Ensure topic + title exist for admin library and practice UI. */
function normalizeListeningTask(
  task: GeneratedListeningTask,
  listeningType: string,
  config: (typeof partConfig)[string],
): GeneratedListeningTask {
  const trimmedTopic = task.topic?.trim();
  const trimmedTitle = task.title?.trim();

  if (trimmedTopic) {
    task.topic = trimmedTopic;
  } else if (trimmedTitle) {
    task.topic = trimmedTitle;
  } else {
    task.topic = `${listeningType} — Canadian everyday scenario`;
  }

  if (trimmedTitle) {
    task.title = trimmedTitle;
  } else {
    task.title = task.topic;
  }

  if (!task.listening_type) task.listening_type = listeningType;
  if (!task.part_description) task.part_description = config.description;
  if (!task.audio_length) task.audio_length = config.audioLength;
  if (task.answer_time_seconds == null) task.answer_time_seconds = config.answerTimeSeconds;

  return task;
}

// Assign Google TTS voice based on speaker index and part type
function assignVoice(speakerIndex: number, partType: string): string {
  if (partType === "News Item" || partType === "Viewpoints") {
    return VOICES.news;
  }
  if (partType === "Discussion") {
    const voices = [VOICES.female1, VOICES.male1, VOICES.female2];
    return voices[speakerIndex % 3];
  }
  // 2-person conversation
  return speakerIndex === 0 ? VOICES.female1 : VOICES.male1;
}

// Generate MP3 for a single line using Google TTS
async function generateLineAudio(text: string, voiceName: string): Promise<Buffer | null> {
  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: "en-US",
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 0.92,
            pitch: 0,
            effectsProfileId: ["headphone-class-device"],
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Google TTS error:", err);
      return null;
    }

    const data = await response.json();
    return Buffer.from(data.audioContent, "base64");
  } catch (error) {
    console.error("TTS line error:", error);
    return null;
  }
}

// Concatenate all audio buffers into one MP3
function concatenateAudioBuffers(buffers: Buffer[]): Buffer {
  return Buffer.concat(buffers);
}

// Upload combined MP3 to Supabase Storage
async function uploadAudio(audioBuffer: Buffer, filename: string): Promise<string | null> {
  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.storage
      .from("audio-files")
      .upload(filename, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data } = supabase.storage
      .from("audio-files")
      .getPublicUrl(filename);

    return data.publicUrl;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const listeningType = body.listeningType || "Daily Life Conversation";
    const config = partConfig[listeningType] || partConfig["Daily Life Conversation"];

    let dialogueInstruction = "";
    let sectionInstruction = "";
    const questionFormat = listeningType === "Problem Solving" ? `"section": 1,` : "";

    if (listeningType === "Problem Solving") {
      dialogueInstruction = `Create a Problem Solving listening task with 3 COMPLETELY SEPARATE dialogue sections.
      All 3 sections share the same two speakers and overall topic, but each section is a self-contained conversation clip.

      Structure:
      - section_1: 45-75 seconds of audio. Introduce the two characters, clearly define the main problem, and begin the initial discussion. Questions 1-3 must be answerable ONLY from this section.
      - section_2: 45-75 seconds of audio. Develop the middle of the conversation: details, options, complications, or obstacles related to the problem. Questions 4-6 must be answerable ONLY from this section.
      - section_3: 45-75 seconds of audio. Conclude the conversation with a compromise, final decision, clear next step, or solution. Questions 7-8 must be answerable ONLY from this section.

      CRITICAL RULES:
      - Each section should be about 90-150 spoken words, enough for 45-75 seconds at natural TTS speed
      - Each section's dialogue must contain ALL information needed to answer its questions
      - NO question should require listening to another section to answer
      - Each section should make sense independently as a standalone audio clip

      Return the dialogue as a flat array but tag each line with its section number.`;
            sectionInstruction = `Generate exactly 8 questions total:
      - Questions 1-3: add "section": 1 — answerable ONLY from section_1 dialogue
      - Questions 4-6: add "section": 2 — answerable ONLY from section_2 dialogue  
      - Questions 7-8: add "section": 3 — answerable ONLY from section_3 dialogue
      VERIFY: each question's answer must exist explicitly in its section's dialogue lines only.`;
    }else if (listeningType === "News Item") {
      dialogueInstruction = `Create a news monologue with ONE speaker named "Reporter".
Target audio length: 1.5-2 minutes, about 190-260 spoken words. Formal Canadian broadcast news style. Include specific names, numbers, dates.`;
    } else if (listeningType === "Viewpoints") {
      dialogueInstruction = `Create a persuasive monologue with ONE speaker named "Speaker".
Target audio length: 2.5-3 minutes, about 330-420 spoken words. Structured argument with evidence and examples.`;
    } else if (listeningType === "Discussion") {
      dialogueInstruction = `Create a discussion with exactly 3 speakers: "Host", "Alex", "Maria".
Target audio length: 1.5-2 minutes, about 190-260 spoken words total.
Host asks 3-4 short questions. Alex and Maria each give 2-3 responses of 1-2 sentences each.
Keep each response SHORT — maximum 2 sentences per turn.`;
    } else {
      dialogueInstruction = `Create a natural conversation between 2 speakers named "Sarah" and "David".
Target audio length: ${listeningType === "Listening for Information" ? "2.0-2.5 minutes, about 260-340 spoken words" : config.audioLength}.
Use ${listeningType === "Daily Life Conversation" ? "8-10" : "12-16"} exchanges.
Include natural filler words (um, well, actually), contractions, and short reactions.`;
    }

    // Step 1: Generate dialogue and questions with Claude
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      system: "You are a certified CELPIP examiner. Generate realistic CELPIP Listening test content. Return raw JSON only. No markdown. No backticks.",
      messages: [{
        role: "user",
        content: `Generate a CELPIP Listening "${listeningType}" task.

DIFFICULTY: ${config.difficulty}
VOCABULARY: ${config.vocabulary}
TOPICS: ${config.topics}
STYLE: ${config.speechStyle}
SPEAKERS: ${config.speakers}

${dialogueInstruction}
${sectionInstruction}

TOPIC RULES (required):
- "topic" = a short, specific scenario label for the admin task library (5–14 words).
  Examples: "Booking a vet appointment by phone", "Neighbours discussing a parking dispute".
- "title" = a slightly more engaging headline shown to students (can match topic or expand it).
- The dialogue and all questions MUST match this topic — do not use a generic placeholder.

Return ONLY raw JSON:
{
  "listening_type": "${listeningType}",
  "part_description": "${config.description}",
  "audio_length": "${config.audioLength}",
  "answer_time_seconds": ${config.answerTimeSeconds},
  "topic": "specific short scenario label",
  "title": "engaging student-facing headline for this passage",
  "dialogue": [
    {"speaker": "Speaker Name", "text": "what they say naturally", "section": 1}
  ],
  "questions": [
    {
      "id": 1,
      ${questionFormat}
      "question": "question text",
      "options": { "A": "option", "B": "option", "C": "option", "D": "option" },
      "correct_answer": "A",
      "explanation": "why this is correct with dialogue reference",
      "option_explanations": {
        "A": "why A is correct/incorrect",
        "B": "why B is correct/incorrect",
        "C": "why C is correct/incorrect",
        "D": "why D is correct/incorrect"
      }
    }
  ]
}

Generate exactly ${config.questions} questions.
Use realistic Canadian names, places, and situations.`
      }]
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const task = normalizeListeningTask(
      JSON.parse(cleaned) as GeneratedListeningTask,
      listeningType,
      config,
    );

    // Step 2: Build speaker map
    const dialogue = task.dialogue ?? [];
    if (dialogue.length === 0) {
      return NextResponse.json({ error: "Generated task is missing dialogue lines." }, { status: 422 });
    }

    const speakerMap: Record<string, number> = {};
    dialogue.forEach((line: { speaker: string; text: string }) => {
      if (!(line.speaker in speakerMap)) {
        speakerMap[line.speaker] = Object.keys(speakerMap).length;
      }
    });

    // Step 3: Generate audio for each dialogue line
    console.log(`Generating audio for ${dialogue.length} lines...`);
    const audioBuffers: Buffer[] = [];
    const silence = Buffer.alloc(8000); // ~0.5s silence between lines

    for (const line of dialogue) {
      const speakerIndex = speakerMap[line.speaker] ?? 0;
      const voice = assignVoice(speakerIndex, listeningType);
      const buffer = await generateLineAudio(line.text, voice);
      if (buffer) {
        audioBuffers.push(buffer);
        audioBuffers.push(silence); // add pause between speakers
      }
    }

    // Step 4: Combine and upload
    if (audioBuffers.length > 0) {
      console.log("Uploading audio to Supabase...");
      const combined = concatenateAudioBuffers(audioBuffers);
      const filename = `listening_${listeningType.replace(/ /g, "_")}_${Date.now()}.mp3`;
      const audioUrl = await uploadAudio(combined, filename);

      if (audioUrl) {
        task.audio_url = audioUrl;
        console.log("Audio uploaded:", audioUrl);
      }
    }

    return NextResponse.json(task);

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
