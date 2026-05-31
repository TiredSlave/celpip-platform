"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { lookupEnglishIPA, isStandaloneWordForIPA } from "../lib/vocabulary-lookup";
import { SPEAKING_VOCABULARY_SEED, SPEAKING_TASK_LABELS } from "../lib/speaking-vocabulary-seed";
import {
  deleteUserVocabularyItem,
  loadSpeakingPatterns,
  loadUserVocabulary,
  toggleUserVocabularyFavorite,
  updateUserVocabularyPhonetic,
  type SpeakingPattern,
} from "../lib/vocabulary-store";
import type { SavedVocabularyItem } from "../lib/vocabulary-storage";
import { VOCABULARY_CHANGED_EVENT } from "../lib/vocabulary-events";

type PopoverTarget =
  | { kind: "saved"; item: SavedVocabularyItem; x: number; y: number }
  | { kind: "speaking"; row: SpeakingPattern; x: number; y: number };

export default function VocabularyPage() {
  const [saved, setSaved] = useState<SavedVocabularyItem[]>([]);
  const [speakingRows, setSpeakingRows] = useState<SpeakingPattern[]>(SPEAKING_VOCABULARY_SEED);
  const [popover, setPopover] = useState<PopoverTarget | null>(null);
  const [ipaLine, setIpaLine] = useState<string>("");

  const reload = useCallback(async () => {
    const [u, s] = await Promise.all([
      loadUserVocabulary(),
      loadSpeakingPatterns(SPEAKING_VOCABULARY_SEED),
    ]);
    setSaved(u);
    setSpeakingRows(s);
  }, []);

  useEffect(() => {
    void reload();
    window.addEventListener(VOCABULARY_CHANGED_EVENT, reload);
    return () => window.removeEventListener(VOCABULARY_CHANGED_EVENT, reload);
  }, [reload]);

  useEffect(() => {
    if (!popover || popover.kind !== "saved") {
      setIpaLine("");
      return;
    }
    const item = popover.item;
    if (!isStandaloneWordForIPA(item.term)) {
      setIpaLine("— (IPA only for a single English word)");
      return;
    }
    let cancelled = false;
    if (item.phonetic) {
      setIpaLine(item.phonetic);
      return;
    }
    setIpaLine("Looking up…");
    lookupEnglishIPA(item.term).then(async ipa => {
      if (cancelled) return;
      if (ipa) {
        setIpaLine(ipa);
        await updateUserVocabularyPhonetic(item.id, ipa);
        await reload();
      } else {
        setIpaLine("— (no IPA found)");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [popover, reload]);

  const readingItems = useMemo(() => saved.filter(s => s.source === "reading"), [saved]);
  const listeningItems = useMemo(() => saved.filter(s => s.source === "listening"), [saved]);

  function SavedRow({ item }: { item: SavedVocabularyItem }) {
    return (
      <li className="rounded-xl border border-gray-100 px-3 py-2 hover:bg-gray-50 flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex-1 text-left font-medium text-gray-800 min-w-0"
          onClick={e => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setPopover({ kind: "saved", item, x: rect.left + rect.width / 2, y: rect.bottom + 6 });
          }}
        >
          {item.term}
        </button>
        <span className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="text-amber-500 p-1"
            onClick={async () => {
              await toggleUserVocabularyFavorite(item.id, item.isFavorite);
              await reload();
            }}
            title="Favorite"
          >
            {item.isFavorite ? "★" : "☆"}
          </button>
          <button
            type="button"
            className="text-red-400 p-1 text-xs"
            onClick={async () => {
              await deleteUserVocabularyItem(item.id);
              await reload();
              setPopover(p => (p?.kind === "saved" && p.item.id === item.id ? null : p));
            }}
            title="Delete"
          >
            🗑
          </button>
        </span>
      </li>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Home</Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Vocabulary</h1>
          <p className="text-gray-600 mt-2 max-w-3xl">
            <strong>Section 1</strong> — words saved from reading (plain text) and listening transcripts. When logged in, items sync to Supabase table{" "}
            <code className="text-sm bg-gray-200 px-1 rounded">user_vocabulary</code>. Guests use browser storage only.
            <strong className="ml-1">Section 2</strong> — speaking phrases from <code className="text-sm bg-gray-200 px-1 rounded">speaking_vocabulary</code> if the table has rows; otherwise the built-in seed list.
            IPA is shown only for a <strong>single English word</strong> (no audio).
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2 border-b border-gray-200 pb-2">
            From reading & listening
          </h2>
          <p className="text-sm text-gray-600 mb-4">Click a saved word for IPA (single words only) and sample sentence. Star to pin; delete when learned.</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">📖 Reading</h3>
              {readingItems.length === 0 ? (
                <p className="text-sm text-gray-600">No saved words yet. Open a reading task (plain-text passage) and click a word.</p>
              ) : (
                <ul className="space-y-2">
                  {readingItems.map(item => (
                    <SavedRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">🎧 Listening</h3>
              {listeningItems.length === 0 ? (
                <p className="text-sm text-gray-600">No saved words yet. Expand the transcript and click a word.</p>
              ) : (
                <ul className="space-y-2">
                  {listeningItems.map(item => (
                    <SavedRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2 border-b border-gray-200 pb-2">
            Speaking — useful phrases & connectors
          </h2>
          <p className="text-sm text-gray-600 mb-4">{speakingRows.length} records. Click a card for an example sentence.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {speakingRows.map(row => (
              <button
                key={row.id}
                type="button"
                onClick={e => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setPopover({ kind: "speaking", row, x: rect.left + rect.width / 2, y: rect.bottom + 6 });
                }}
                className="text-left rounded-2xl border border-purple-100 bg-white p-4 shadow-sm hover:border-purple-300 hover:shadow transition"
              >
                <p className="text-xs font-bold text-purple-600 mb-1">{SPEAKING_TASK_LABELS[row.taskNumber] || `Task ${row.taskNumber}`}</p>
                <p className="text-sm font-semibold text-gray-900 mb-1">{row.phrase}</p>
                <p className="text-xs text-gray-600">{row.category}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {popover?.kind === "saved" && (
        <div
          className="fixed z-[200] w-[min(92vw,360px)] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
          style={{
            left: Math.min(window.innerWidth - 380, Math.max(12, popover.x - 180)),
            top: Math.min(window.innerHeight - 220, popover.y),
          }}
        >
          <p className="text-xs text-gray-600 uppercase font-bold mb-1">Saved word</p>
          <p className="text-lg font-bold text-gray-900 mb-2">{popover.item.term}</p>
          <p className="text-sm text-gray-700 mb-3">
            <span className="font-semibold">IPA: </span>
            <span className="font-mono">{ipaLine}</span>
          </p>
          <p className="text-xs font-semibold text-gray-700 mb-1">Sample sentence</p>
          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3">{popover.item.sampleSentence}</p>
          <p className="text-xs text-gray-600 mt-2 line-clamp-3">Context: {popover.item.contextSnippet}</p>
          <button type="button" className="mt-3 text-sm text-blue-600 hover:underline" onClick={() => setPopover(null)}>
            Close
          </button>
        </div>
      )}

      {popover?.kind === "speaking" && (
        <div
          className="fixed z-[200] w-[min(92vw,400px)] rounded-2xl border border-purple-200 bg-white p-4 shadow-2xl"
          style={{
            left: Math.min(window.innerWidth - 420, Math.max(12, popover.x - 200)),
            top: Math.min(window.innerHeight - 240, popover.y),
          }}
        >
          <p className="text-xs text-purple-600 font-bold mb-1">{SPEAKING_TASK_LABELS[popover.row.taskNumber] || `Task ${popover.row.taskNumber}`}</p>
          <p className="text-lg font-bold text-gray-900 mb-2">{popover.row.phrase}</p>
          <p className="text-xs font-semibold text-gray-600 mb-1">Example</p>
          <p className="text-sm text-gray-800 leading-relaxed bg-purple-50 rounded-lg p-3">{popover.row.exampleSentence}</p>
          <button type="button" className="mt-3 text-sm text-blue-600 hover:underline" onClick={() => setPopover(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
