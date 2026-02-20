import type { Verse } from '@/data/quran';

interface QuranVersesResponse {
  verses: Array<{
    verse_key: string;
    text_uthmani: string;
    juz_number: number;
    page_number: number;
  }>;
}

interface QuranTranslationsResponse {
  translations: Array<{
    verse_key: string;
    text: string;
  }>;
}

const TRANSLATION_ID = 20;
const surahCache = new Map<number, Verse[]>();
const localStoragePrefix = 'quranSurahCache:';

function cleanTranslation(text: string): string {
  return text
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function loadFromStorage(surahNumber: number): Verse[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(`${localStoragePrefix}${surahNumber}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Verse[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(surahNumber: number, verses: Verse[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(`${localStoragePrefix}${surahNumber}`, JSON.stringify(verses));
  } catch {
    // Ignore storage failures (quota/private mode).
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchSurahVerses(surahNumber: number): Promise<Verse[]> {
  if (surahNumber < 1 || surahNumber > 114) {
    throw new Error('Invalid surah number');
  }

  const cached = surahCache.get(surahNumber);
  if (cached) {
    return cached;
  }

  const stored = loadFromStorage(surahNumber);
  if (stored) {
    surahCache.set(surahNumber, stored);
    return stored;
  }

  const versesUrl = `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahNumber}`;
  const translationUrl = `https://api.quran.com/api/v4/quran/translations/${TRANSLATION_ID}?chapter_number=${surahNumber}&fields=verse_key,text`;

  const [versesResponse, translationResponse] = await Promise.all([
    fetchJson<QuranVersesResponse>(versesUrl),
    fetchJson<QuranTranslationsResponse>(translationUrl).catch(() => ({ translations: [] }))
  ]);

  const translationMap = new Map<string, string>(
    translationResponse.translations.map((item) => [item.verse_key, cleanTranslation(item.text)])
  );

  const verses = versesResponse.verses.map((verse, index) => ({
    number: index + 1,
    text: verse.text_uthmani.trim(),
    translation: translationMap.get(verse.verse_key) ?? '',
    juz: verse.juz_number,
    page: verse.page_number
  }));

  surahCache.set(surahNumber, verses);
  saveToStorage(surahNumber, verses);
  return verses;
}
