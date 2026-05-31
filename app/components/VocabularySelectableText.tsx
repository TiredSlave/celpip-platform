"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveUserVocabularyItem } from "../lib/vocabulary-store";
import { notifyVocabularyChanged } from "../lib/vocabulary-events";
import type { VocabSource } from "../lib/vocabulary-storage";

type Props = {
  text: string;
  source: VocabSource;
  taskId: string | null;
  className?: string;
};

function stripWord(raw: string) {
  return raw.replace(/^[^a-zA-Z0-9'-]+/, "").replace(/[^a-zA-Z0-9'-]+$/, "");
}

/** Plain text split into words: hover highlights; click opens save popover. */
export function VocabularySelectableText({ text, source, taskId, className = "" }: Props) {
  const [popover, setPopover] = useState<{ word: string; left: number; top: number } | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const tokens = useMemo(() => {
    const parts = text.split(/(\s+)/);
    return parts.map((p, i) => ({ key: i, raw: p, isSpace: /^\s+$/.test(p) }));
  }, [text]);

  useEffect(() => {
    if (!popover) return;
    function close(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPopover(null);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [popover]);

  const handleSave = useCallback(() => {
    if (!popover?.word) return;
    const w = stripWord(popover.word);
    if (!w) return;
    void (async () => {
      await saveUserVocabularyItem({
        term: w,
        source,
        taskId,
        contextSnippet: text.slice(0, 400),
      });
      notifyVocabularyChanged();
    })();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
    setPopover(null);
  }, [popover, source, taskId, text]);

  return (
    <div ref={rootRef} className={`relative inline-block max-w-full ${className}`}>
      <span className="leading-relaxed">
        {tokens.map(({ key, raw, isSpace }) =>
          isSpace ? (
            <span key={key}>{raw}</span>
          ) : (
            <span
              key={key}
              role="button"
              tabIndex={0}
              onClick={e => {
                e.stopPropagation();
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setPopover({
                  word: raw,
                  left: rect.left + rect.width / 2,
                  top: rect.bottom + 4,
                });
              }}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  (e.target as HTMLElement).click();
                }
              }}
              className="cursor-pointer rounded px-0.5 hover:bg-amber-100/90 hover:ring-1 hover:ring-amber-300 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {raw}
            </span>
          ),
        )}
      </span>

      {popover && (
        <div
          className="fixed z-[100]"
          style={{
            left: Math.min(window.innerWidth - 220, Math.max(8, popover.left - 110)),
            top: Math.min(window.innerHeight - 80, popover.top),
          }}
        >
          <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 shadow-xl text-xs min-w-[200px]">
            <span className="text-gray-600">Add to vocabulary</span>
            <span className="font-semibold text-gray-900">{stripWord(popover.word) || popover.word.trim()}</span>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-amber-500 py-2 font-semibold text-white hover:bg-amber-600"
            >
              Save word
            </button>
          </div>
        </div>
      )}
      {savedFlash && (
        <div className="fixed bottom-6 left-1/2 z-[101] -translate-x-1/2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          Saved to vocabulary library
        </div>
      )}
    </div>
  );
}
