import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { SUPPORT_CHAT_KNOWLEDGE } from "@/app/lib/support-chat-knowledge";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
} from "@/app/lib/support-contact";
import { tryParseLlmJson } from "@/app/lib/reading-llm-json";
import { SITE_NAME } from "@/app/lib/brand";

const anthropic = new Anthropic();
const MAX_MESSAGE_CHARS = 800;
const MAX_HISTORY = 12;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SupportChatModelResponse = {
  answer: string;
  escalate: boolean;
};

function buildEscalationReply(): string {
  return `I’m not sure I can answer that accurately. Please contact our team directly:

Phone: ${SUPPORT_PHONE_DISPLAY} (${SUPPORT_PHONE})
Email: ${SUPPORT_EMAIL}`;
}

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        reply: buildEscalationReply(),
        showContact: true,
      });
    }

    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const trimmed = messages
      .slice(-MAX_HISTORY)
      .filter(
        (m): m is ChatMessage =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      )
      .map((m) => ({
        role: m.role,
        content: m.content.trim().slice(0, MAX_MESSAGE_CHARS),
      }));

    if (trimmed.at(-1)?.role !== "user") {
      return NextResponse.json({ error: "Last message must be from the user." }, { status: 400 });
    }

    const system = `You are the helpful customer support assistant for ${SITE_NAME}, a CELPIP practice website.

Use ONLY the knowledge below. Do not invent pricing, subscriptions, refunds, account policies, or features that are not listed. Do not give immigration or legal advice.

When the user asks about something you cannot answer confidently from the knowledge below — including billing, refunds, account issues, technical bugs, partnerships, custom requests, official CELPIP policies, or anything outside this site — set escalate to true and give a brief polite answer that directs them to human support.

When escalate is true, your answer MUST include both:
- Phone: ${SUPPORT_PHONE_DISPLAY} (${SUPPORT_PHONE})
- Email: ${SUPPORT_EMAIL}

Keep answers concise (2-5 short paragraphs max), friendly, and practical. Mention relevant pages (e.g. /practice, /templates) when helpful.

Respond with JSON only:
{"answer":"...","escalate":false}

Knowledge:
${SUPPORT_CHAT_KNOWLEDGE}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      temperature: 0.2,
      system,
      messages: trimmed.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const block = response.content[0];
    const raw = block.type === "text" ? block.text : "";
    const parsed = tryParseLlmJson<SupportChatModelResponse>(raw);

    if (!parsed?.answer?.trim()) {
      return NextResponse.json({
        reply: buildEscalationReply(),
        showContact: true,
      });
    }

    const showContact =
      Boolean(parsed.escalate) ||
      parsed.answer.includes(SUPPORT_EMAIL) ||
      parsed.answer.includes(SUPPORT_PHONE);

    return NextResponse.json({
      reply: parsed.answer.trim(),
      showContact,
    });
  } catch (error) {
    console.error("Support chat error:", error);
    return NextResponse.json({
      reply: buildEscalationReply(),
      showContact: true,
    });
  }
}
