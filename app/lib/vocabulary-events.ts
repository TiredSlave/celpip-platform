export const VOCABULARY_CHANGED_EVENT = "celpip-vocab-changed";

export function notifyVocabularyChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(VOCABULARY_CHANGED_EVENT));
  }
}
