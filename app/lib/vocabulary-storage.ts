const STORAGE_KEY = "celpip_vocab_saved";

export type VocabSource = "reading" | "listening";

export type SavedVocabularyItem = {
  id: string;
  term: string;
  source: VocabSource;
  taskId: string | null;
  contextSnippet: string;
  sampleSentence: string;
  phonetic: string | null;
  isFavorite: boolean;
  createdAt: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadSavedVocabulary(): SavedVocabularyItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedVocabularyItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persist(items: SavedVocabularyItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Clear guest cache after migrating to Supabase (or reset). */
export function clearLocalSavedVocabulary() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function saveVocabularyItem(input: {
  term: string;
  source: VocabSource;
  taskId: string | null;
  contextSnippet: string;
  sampleSentence?: string;
}): SavedVocabularyItem {
  const term = input.term.trim();
  const items = loadSavedVocabulary();
  const dup = items.some(
    i => i.term.toLowerCase() === term.toLowerCase() && i.source === input.source && i.taskId === input.taskId,
  );
  if (dup) {
    const existing = items.find(
      i => i.term.toLowerCase() === term.toLowerCase() && i.source === input.source && i.taskId === input.taskId,
    )!;
    return existing;
  }
  const row: SavedVocabularyItem = {
    id: uid(),
    term,
    source: input.source,
    taskId: input.taskId,
    contextSnippet: (input.contextSnippet || "").slice(0, 500),
    sampleSentence: (input.sampleSentence || buildDefaultSample(term, input.contextSnippet)).slice(0, 800),
    phonetic: null,
    isFavorite: false,
    createdAt: new Date().toISOString(),
  };
  items.unshift(row);
  persist(items);
  return row;
}

function buildDefaultSample(term: string, ctx: string) {
  const c = ctx.trim();
  if (c.length > 20) return `From your reading/listening: "…${c.slice(0, 120)}…" — focus word: **${term}**.`;
  return `Practice using **${term}** in your own sentence about the passage or dialogue you were studying.`;
}

export function deleteVocabularyItem(id: string) {
  persist(loadSavedVocabulary().filter(i => i.id !== id));
}

export function toggleFavoriteVocabulary(id: string) {
  const items = loadSavedVocabulary().map(i => (i.id === id ? { ...i, isFavorite: !i.isFavorite } : i));
  persist(items);
}

export function updateVocabularyItem(id: string, patch: Partial<Pick<SavedVocabularyItem, "phonetic" | "sampleSentence">>) {
  const items = loadSavedVocabulary().map(i => (i.id === id ? { ...i, ...patch } : i));
  persist(items);
}

export function sortSavedForDisplay(items: SavedVocabularyItem[]) {
  return [...items].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
