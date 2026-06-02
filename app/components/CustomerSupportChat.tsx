"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
} from "../lib/support-contact";
import { SITE_NAME } from "../lib/brand";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  showContact?: boolean;
};

const STORAGE_KEY = "celpip-support-chat-v1";

const HIDE_SUPPORT_CHAT = [
  "/admin",
  "/practice/writing/task",
  "/practice/reading/task",
  "/practice/speaking/task",
  "/practice/listening/task",
];

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: `Hi! I’m the ${SITE_NAME} assistant. Ask me what you can practice here, how mock tests work, or where to find templates. If I’m not sure, I’ll connect you with our team.`,
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ContactCard() {
  return (
    <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">Contact our team</p>
      <div className="mt-2 space-y-1.5">
        <a
          href={`tel:${SUPPORT_PHONE}`}
          className="block font-medium text-blue-700 hover:text-blue-800 hover:underline"
        >
          {SUPPORT_PHONE_DISPLAY}
        </a>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="block font-medium text-blue-700 hover:text-blue-800 hover:underline break-all"
        >
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
}

export default function CustomerSupportChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hideChat =
    HIDE_SUPPORT_CHAT.some((p) => pathname?.startsWith(p)) ||
    Boolean(pathname?.match(/\/mock-test\/[^/]+\/(take|review)/));

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    inputRef.current?.focus();
  }, [open, messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        showContact?: boolean;
        error?: string;
      };

      const reply =
        data.reply ||
        "I’m having trouble answering right now. Please contact our team directly.";

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          content: reply,
          showContact: Boolean(data.showContact),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          content:
            "Something went wrong on my side. Please reach out to our team directly.",
          showContact: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  if (hideChat) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      {open && (
        <div className="flex w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-300/40 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">{SITE_NAME} Support</p>
              <p className="text-xs text-blue-100">Ask about practice features</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/90 transition hover:bg-white/15"
              aria-label="Close support chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div ref={listRef} className="max-h-[min(60vh,28rem)] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === "assistant" && message.showContact && <ContactCard />}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Ask about CELPIP practice here..."
                className="max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={loading || !input.trim()}
                className="rounded-2xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Need a person?{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">
                Email us
              </a>{" "}
              or call{" "}
              <a href={`tel:${SUPPORT_PHONE}`} className="text-blue-600 hover:underline">
                {SUPPORT_PHONE_DISPLAY}
              </a>
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-300/50 transition hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200"
        aria-label={open ? "Close support chat" : "Open support chat"}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M7 8h10M7 12h6M6 18 3 9.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-3 3Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
