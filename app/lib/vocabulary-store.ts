import { supabase } from "./supabase";
import {
  loadSavedVocabulary,
  clearLocalSavedVocabulary,
  sortSavedForDisplay,
  type SavedVocabularyItem,
  type VocabSource,
} from "./vocabulary-storage";

const MIGRATION_FLAG = "celpip_vocab_migrated_to_supabase";

export type SpeakingPattern = {
  id: string;
  taskNumber: number;
  phrase: string;
  category: string;
  exampleSentence: string;
};

function buildDefaultSample(term: string, ctx: string) {
  const c = ctx.trim();
  if (c.length > 20) return `From your reading/listening: "…${c.slice(0, 120)}…" — focus word: **${term}**.`;
  return `Practice using **${term}** in your own sentence about the passage or dialogue you were studying.`;
}

function mapUserRow(row: {
  id: string;
  term: string;
  source: string;
  task_id: string | null;
  context_snippet: string | null;
  sample_sentence: string | null;
  phonetic: string | null;
  is_favorite: boolean;
  created_at: string;
}): SavedVocabularyItem {
  return {
    id: row.id,
    term: row.term,
    source: row.source as VocabSource,
    taskId: row.task_id,
    contextSnippet: row.context_snippet || "",
    sampleSentence: row.sample_sentence || "",
    phonetic: row.phonetic,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
  };
}

function mapSpeakingRow(row: {
  id: string;
  task_number: number;
  phrase: string;
  category: string | null;
  example_sentence: string;
}): SpeakingPattern {
  return {
    id: row.id,
    taskNumber: row.task_number,
    phrase: row.phrase,
    category: row.category || "",
    exampleSentence: row.example_sentence,
  };
}

/** One-time: push localStorage saves into Supabase for the signed-in user, then clear local list. */
async function migrateLocalToSupabaseIfNeeded(userId: string) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG)) return;
  const local = loadSavedVocabulary();
  if (local.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, "1");
    return;
  }
  let failed = 0;
  for (const item of local) {
    const { error } = await supabase.from("user_vocabulary").insert({
      user_id: userId,
      term: item.term,
      source: item.source,
      task_id: item.taskId,
      context_snippet: item.contextSnippet,
      sample_sentence: item.sampleSentence,
      phonetic: item.phonetic,
      is_favorite: item.isFavorite,
    });
    if (error && !error.message.includes("duplicate") && !error.message.includes("unique")) {
      failed++;
      console.warn("vocabulary migrate row:", error.message);
    }
  }
  if (failed === 0) {
    clearLocalSavedVocabulary();
    localStorage.setItem(MIGRATION_FLAG, "1");
  }
}

export async function loadUserVocabulary(): Promise<SavedVocabularyItem[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return sortSavedForDisplay(loadSavedVocabulary());
  }
  await migrateLocalToSupabaseIfNeeded(session.user.id);

  const { data, error } = await supabase
    .from("user_vocabulary")
    .select("id, term, source, task_id, context_snippet, sample_sentence, phonetic, is_favorite, created_at")
    .eq("user_id", session.user.id)
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("user_vocabulary load:", error.message);
    return sortSavedForDisplay(loadSavedVocabulary());
  }
  return sortSavedForDisplay((data || []).map(mapUserRow));
}

export async function saveUserVocabularyItem(input: {
  term: string;
  source: VocabSource;
  taskId: string | null;
  contextSnippet: string;
  sampleSentence?: string;
}): Promise<SavedVocabularyItem | null> {
  const term = input.term.trim();
  if (!term) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    const { saveVocabularyItem } = await import("./vocabulary-storage");
    return saveVocabularyItem(input);
  }

  const sample = (input.sampleSentence || buildDefaultSample(term, input.contextSnippet)).slice(0, 800);
  const snippet = (input.contextSnippet || "").slice(0, 500);

  const { data, error } = await supabase
    .from("user_vocabulary")
    .insert({
      user_id: session.user.id,
      term,
      source: input.source,
      task_id: input.taskId,
      context_snippet: snippet,
      sample_sentence: sample,
      is_favorite: false,
    })
    .select("id, term, source, task_id, context_snippet, sample_sentence, phonetic, is_favorite, created_at")
    .single();

  if (error) {
    if (error.code === "23505" || error.message.includes("duplicate")) {
      const all = await loadUserVocabulary();
      const dup = all.find(
        d =>
          d.term.toLowerCase() === term.toLowerCase() &&
          d.source === input.source &&
          d.taskId === input.taskId,
      );
      return dup || null;
    }
    console.warn("user_vocabulary insert:", error.message);
    return null;
  }
  return data ? mapUserRow(data as any) : null;
}

export async function deleteUserVocabularyItem(id: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    const { deleteVocabularyItem } = await import("./vocabulary-storage");
    deleteVocabularyItem(id);
    return;
  }
  await supabase.from("user_vocabulary").delete().eq("id", id).eq("user_id", session.user.id);
}

export async function toggleUserVocabularyFavorite(id: string, current: boolean) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    const { toggleFavoriteVocabulary } = await import("./vocabulary-storage");
    toggleFavoriteVocabulary(id);
    return;
  }
  await supabase
    .from("user_vocabulary")
    .update({ is_favorite: !current })
    .eq("id", id)
    .eq("user_id", session.user.id);
}

export async function updateUserVocabularyPhonetic(id: string, phonetic: string | null) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    const { updateVocabularyItem } = await import("./vocabulary-storage");
    updateVocabularyItem(id, { phonetic: phonetic || undefined });
    return;
  }
  await supabase.from("user_vocabulary").update({ phonetic }).eq("id", id).eq("user_id", session.user.id);
}

export async function loadSpeakingPatterns(fallback: SpeakingPattern[]): Promise<SpeakingPattern[]> {
  const { data, error } = await supabase
    .from("speaking_vocabulary")
    .select("id, task_number, phrase, category, example_sentence")
    .order("task_number", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("speaking_vocabulary load:", error.message);
    return fallback;
  }
  if (!data?.length) return fallback;
  return data.map(row => mapSpeakingRow(row as Parameters<typeof mapSpeakingRow>[0]));
}
