import { NextResponse } from "next/server";

const VOICES: Record<string, string> = {
  female1: "en-US-Neural2-F",
  male1:   "en-US-Neural2-D",
  female2: "en-US-Neural2-C",
  news:    "en-US-Neural2-J",
};

function getVoice(speakerIndex: number, type: string): string {
  if (type === "News Item" || type === "Viewpoints") return VOICES.news;
  if (type === "Discussion") return [VOICES.female1, VOICES.male1, VOICES.female2][speakerIndex % 3];
  return speakerIndex === 0 ? VOICES.female1 : VOICES.male1;
}

export async function POST(request: Request) {
  try {
    const { lines, listeningType, isQuestion } = await request.json();

    // Build speaker map
    const speakerMap: Record<string, number> = {};
    (lines as { speaker?: string; text: string }[]).forEach(line => {
      const sp = line.speaker || "Narrator";
      if (!(sp in speakerMap)) speakerMap[sp] = Object.keys(speakerMap).length;
    });

    // For single question text — use one voice
    if (isQuestion || lines.length === 1) {
      const text = lines[0].text || lines[0];
      const voice = isQuestion ? VOICES.female1 : getVoice(0, listeningType);
      const res = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode: "en-US", name: voice },
            audioConfig: { audioEncoding: "MP3", speakingRate: 0.92, pitch: 0 },
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return NextResponse.json({ chunks: [data.audioContent] });
    }

    // For dialogue — generate each line concurrently (much faster!)
    const audioPromises = (lines as { speaker?: string; text: string }[]).map(async line => {
      const sp = line.speaker || "Narrator";
      const speakerIndex = speakerMap[sp] ?? 0;
      const voice = getVoice(speakerIndex, listeningType);

      const res = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: line.text },
            voice: { languageCode: "en-US", name: voice },
            audioConfig: {
              audioEncoding: "MP3",
              speakingRate: 0.92,
              pitch: 0,
              effectsProfileId: ["headphone-class-device"],
            },
          }),
        }
      );

      if (!res.ok) {
        console.error("TTS error:", await res.text());
        return null;
      }
      const data = await res.json();
      return data.audioContent as string;
    });

    // Run all concurrently
    const results = await Promise.all(audioPromises);
    const chunks = results.filter(Boolean) as string[];

    return NextResponse.json({ chunks });

  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
