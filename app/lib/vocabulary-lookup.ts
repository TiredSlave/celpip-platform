/** True only for a single English token (IPA / dictionary lookup is skipped for phrases). */
export function isStandaloneWordForIPA(term: string): boolean {
  const t = term.trim();
  if (!t || t.length > 45) return false;
  if (/\s/.test(t)) return false;
  return /^[a-zA-Z'-]+$/.test(t);
}

/** Client-side IPA for standalone words only. No audio. */
export async function lookupEnglishIPA(word: string): Promise<string | null> {
  if (!isStandaloneWordForIPA(word)) return null;
  const w = word.trim().toLowerCase();
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const phonetic =
      data[0]?.phonetics?.find((p: { text?: string }) => p.text)?.text ||
      data[0]?.phonetic ||
      null;
    return phonetic || null;
  } catch {
    return null;
  }
}
