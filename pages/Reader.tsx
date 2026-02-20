import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuran } from '@/context/QuranContext';
import { surahs, versesData, reciters, type Verse } from '@/data/quran';
import { fetchSurahVerses } from '@/lib/quran-api';
import quranCardPattern from '@/assets/quran-card-pattern.svg';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Volume2, 
  Bookmark,
  Heart,
  Settings,
  Type,
  Languages,
  Moon,
  Sun,
  Search,
  List,
  X,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import AppLogo from '@/components/app-logo';
import PageInfoPanel from '@/components/page-info-panel';
import { getStoredValue, setStoredValue } from '@/lib/user-storage';

type CatalogView = 'surahs' | 'juz' | 'hizb';
type CatalogImageKind = 'surah' | 'juz' | 'hizb';
type SurahTypeFilter = 'all' | 'مكية' | 'مدنية';
type SurahLengthFilter = 'all' | 'short' | 'medium' | 'long';
type SurahSortMode = 'mushaf' | 'name' | 'verses-asc' | 'verses-desc';

interface HizbVersesResponse {
  verses: Array<{
    verse_key: string;
  }>;
}

interface SavedReadingPosition {
  surah: number;
  verse: number;
}

const RECITER_SURAH_AUDIO_BASE: Record<string, string> = {
  '1': 'https://server7.mp3quran.net/basit/',
  '2': 'https://server13.mp3quran.net/husr/',
  '3': 'https://server8.mp3quran.net/afs/',
  '4': 'https://server6.mp3quran.net/ghamdi/',
  '5': 'https://server11.mp3quran.net/sds/',
  '6': 'https://server12.mp3quran.net/maher/',
  '7': 'https://server11.mp3quran.net/yasser/',
  '8': 'https://server6.mp3quran.net/qtm/'
};

const READING_POSITION_STORAGE_KEY = 'quranLastReadingPosition';

function normalizeSearchText(value: string): string {
  return value
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .toLowerCase()
    .trim();
}

function getSurahLengthBand(verseCount: number): Exclude<SurahLengthFilter, 'all'> {
  if (verseCount <= 30) {
    return 'short';
  }
  if (verseCount <= 100) {
    return 'medium';
  }
  return 'long';
}

function loadSavedReadingPosition(): SavedReadingPosition | null {
  try {
    const raw = getStoredValue(READING_POSITION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SavedReadingPosition>;
    if (typeof parsed.surah !== 'number' || typeof parsed.verse !== 'number') {
      return null;
    }

    return {
      surah: Math.min(114, Math.max(1, Math.trunc(parsed.surah))),
      verse: Math.max(1, Math.trunc(parsed.verse))
    };
  } catch {
    return null;
  }
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildCatalogCardImage(kind: CatalogImageKind, label: string, number?: number): string {
  try {
    const kindLabel = kind === 'surah' ? 'Surah' : kind === 'juz' ? 'Juz' : 'Hizb';
    const seed = number ?? 0;
    const baseHue = kind === 'surah' ? 156 : kind === 'juz' ? 174 : 142;
    const hueA = (baseHue + ((seed * 9) % 28)) % 360;
    const hueB = (hueA + 18) % 360;
    const indexLabel = number ? `#${number}` : 'ALL';
    const safeLabel = escapeSvgText(label);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="hsl(${hueA} 76% 34%)" />
            <stop offset="100%" stop-color="hsl(${hueB} 78% 44%)" />
          </linearGradient>
        </defs>
        <rect width="640" height="240" fill="url(#bg)" rx="20" />
        <circle cx="560" cy="48" r="44" fill="rgba(255,255,255,0.16)" />
        <circle cx="595" cy="92" r="22" fill="rgba(255,255,255,0.12)" />
        <circle cx="52" cy="38" r="10" fill="rgba(255,255,255,0.24)" />
        <path d="M74 18l6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2z" fill="rgba(255,255,255,0.22)" />
        <path d="M578 146l5 10 11 1-8 8 2 11-10-5-10 5 2-11-8-8 11-1z" fill="rgba(255,255,255,0.18)" />
        <text x="24" y="42" fill="rgba(236,253,245,0.9)" font-size="24" font-family="Cairo,Segoe UI,sans-serif">${kindLabel}</text>
        <text x="24" y="86" fill="rgba(209,250,229,0.9)" font-size="26" font-family="Cairo,Segoe UI,sans-serif">${escapeSvgText(indexLabel)}</text>
        <text x="24" y="188" fill="#ffffff" font-size="42" font-weight="700" font-family="Cairo,Segoe UI,sans-serif">${safeLabel}</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  } catch {
    return quranCardPattern;
  }
}

export default function Reader() {
  const isMobile = useIsMobile();
  const {
    currentSurah,
    setCurrentSurah,
    darkMode,
    toggleDarkMode,
    fontSize,
    setFontSize,
    showTranslation,
    toggleTranslation,
    selectedReciter,
    setSelectedReciter,
    isPlaying,
    playAudio,
    pauseAudio,
    bookmarks,
    addBookmark,
    removeBookmark,
    addToFavorites,
    removeFromFavorites,
    userProgress
  } = useQuran();

  const [showSidebar, setShowSidebar] = useState(false);
  const [catalogView, setCatalogView] = useState<CatalogView>('surahs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurahType, setSelectedSurahType] = useState<SurahTypeFilter>('all');
  const [selectedSurahLength, setSelectedSurahLength] = useState<SurahLengthFilter>('all');
  const [surahSortMode, setSurahSortMode] = useState<SurahSortMode>('mushaf');
  const [selectedJuzFilter, setSelectedJuzFilter] = useState<number | null>(null);
  const [selectedHizbFilter, setSelectedHizbFilter] = useState<number | null>(null);
  const [hizbSurahNumbers, setHizbSurahNumbers] = useState<number[] | null>(null);
  const [isLoadingHizb, setIsLoadingHizb] = useState(false);
  const [hizbError, setHizbError] = useState<string | null>(null);
  const [verseSearchQuery, setVerseSearchQuery] = useState('');
  const [currentVerse, setCurrentVerse] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [displayVerses, setDisplayVerses] = useState<Verse[]>(() => versesData[currentSurah] || []);
  const [isLoadingVerses, setIsLoadingVerses] = useState(false);
  const [versesError, setVersesError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const headerRef = useRef<HTMLElement | null>(null);
  const audioBarRef = useRef<HTMLDivElement | null>(null);
  const verseRefs = useRef<Record<number, HTMLElement | null>>({});
  const hizbFilterCache = useRef<Record<number, number[]>>({});
  const catalogImageCache = useRef<Record<string, string>>({});
  const pendingRestorePositionRef = useRef<SavedReadingPosition | null>(null);
  const pendingRestoreScrollVerseRef = useRef<number | null>(null);
  const hasInitializedReadingRestoreRef = useRef(false);
  const [layoutMetrics, setLayoutMetrics] = useState(() => ({
    headerHeight: isMobile ? 88 : 92,
    audioBarHeight: isMobile ? 60 : 68
  }));
  const isDesktopCatalog = !isMobile;
  const isCatalogOpen = isDesktopCatalog || showSidebar;
  const sidebarPositionClass = isCatalogOpen ? 'right-0' : '-right-full';
  const bottomNavInsetExpression = 'var(--app-bottom-nav-height) + env(safe-area-inset-bottom)';
  const audioBarBottomInsetExpression = `${bottomNavInsetExpression} + 0.5rem`;
  const audioBarBottomInset = `calc(${audioBarBottomInsetExpression})`;
  const headerOffset = Math.max(72, Math.round(layoutMetrics.headerHeight));
  const audioBarHeight = Math.max(isMobile ? 58 : 62, Math.round(layoutMetrics.audioBarHeight));
  const sidebarTopInset = isMobile ? '0px' : `calc(${headerOffset}px + 0.75rem)`;
  const sidebarBottomInset = isMobile
    ? `calc(${audioBarBottomInsetExpression} + 0.5rem)`
    : `calc(${bottomNavInsetExpression} + 0.75rem)`;
  const mainTopInset = `calc(${headerOffset}px + 0.75rem)`;
  const mainBottomInset = `calc(${audioBarHeight}px + ${audioBarBottomInsetExpression} + 1rem)`;
  const mobileCatalogButtonBottomInset = `calc(${audioBarHeight}px + ${audioBarBottomInsetExpression} + 0.75rem)`;
  const getCatalogImage = (kind: CatalogImageKind, label: string, number?: number) => {
    const key = `${kind}-${number ?? 'all'}-${label}`;
    const cachedImage = catalogImageCache.current[key];
    if (cachedImage) {
      return cachedImage;
    }

    const generatedImage = buildCatalogCardImage(kind, label, number);
    catalogImageCache.current[key] = generatedImage;
    return generatedImage;
  };
  const selectedReciterName = reciters.find((item) => item.id === selectedReciter)?.nameArabic || 'القارئ الحالي';

  const surah = surahs.find(s => s.number === currentSurah);
  const quickJumpSurahs = [1, 18, 36, 67, 112]
    .map((surahNumber) => surahs.find((item) => item.number === surahNumber))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const totalVerses = displayVerses.length || surah?.verses || 1;
  const normalizedVerseSearchQuery = useMemo(
    () => normalizeSearchText(verseSearchQuery),
    [verseSearchQuery]
  );
  const filteredDisplayVerses = useMemo(() => {
    if (!normalizedVerseSearchQuery) {
      return displayVerses;
    }

    const rawQuery = verseSearchQuery.trim();
    return displayVerses.filter((verse) => {
      const normalizedVerseText = normalizeSearchText(verse.text);
      const normalizedTranslation = normalizeSearchText(verse.translation);
      return (
        normalizedVerseText.includes(normalizedVerseSearchQuery) ||
        normalizedTranslation.includes(normalizedVerseSearchQuery) ||
        verse.number.toString() === rawQuery
      );
    });
  }, [displayVerses, normalizedVerseSearchQuery, verseSearchQuery]);
  const currentVerseData = filteredDisplayVerses.find((verse) => verse.number === currentVerse);
  const currentSurahBookmarks = bookmarks.filter((item) => item.surah === currentSurah).length;
  const readerInfoStats = [
    { label: 'السورة الحالية', value: surah ? `${surah.number} - ${surah.name}` : '-' },
    { label: 'موضع القراءة', value: `${currentVerse}/${totalVerses}` },
    { label: 'مرجعيات السورة', value: currentSurahBookmarks },
    { label: 'القارئ', value: selectedReciterName }
  ];
  const isFavorite = userProgress.favoriteSurahs.includes(currentSurah);
  const juzNumbers = useMemo(() => Array.from({ length: 30 }, (_, index) => index + 1), []);
  const hizbNumbers = useMemo(() => Array.from({ length: 60 }, (_, index) => index + 1), []);
  const firstSurahInJuz = useMemo(() => {
    const mapping: Record<number, number> = {};
    juzNumbers.forEach((juzNumber) => {
      const match = surahs.find((item) => item.juz.includes(juzNumber));
      mapping[juzNumber] = match?.number || 1;
    });
    return mapping;
  }, [juzNumbers]);
  const surahCountInJuz = useMemo(() => {
    const mapping: Record<number, number> = {};
    juzNumbers.forEach((juzNumber) => {
      mapping[juzNumber] = surahs.filter((item) => item.juz.includes(juzNumber)).length;
    });
    return mapping;
  }, [juzNumbers]);
  const normalizedCatalogSearch = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);

  // Filter surahs based on search + juz + hizb
  const filteredSurahs = useMemo(() => {
    let items = surahs.filter((item) => {
      if (!normalizedCatalogSearch) {
        return true;
      }

      const searchableText = [
        item.name,
        item.englishName,
        `سورة ${item.name}`,
        `الجزء ${item.juz.join(' ')}`,
        `صورة سورة ${item.name}`,
        `زخرفة سورة ${item.name}`,
        `surah-${item.number}`
      ].map((text) => normalizeSearchText(text));

      return searchableText.some((text) => text.includes(normalizedCatalogSearch));
    });

    if (selectedJuzFilter) {
      items = items.filter((item) => item.juz.includes(selectedJuzFilter));
    }

    if (selectedHizbFilter) {
      if (!hizbSurahNumbers) {
        return [];
      }
      items = items.filter((item) => hizbSurahNumbers.includes(item.number));
    }

    if (selectedSurahType !== 'all') {
      items = items.filter((item) => item.type === selectedSurahType);
    }

    if (selectedSurahLength !== 'all') {
      items = items.filter((item) => getSurahLengthBand(item.verses) === selectedSurahLength);
    }

    const sortedItems = [...items];
    if (surahSortMode === 'name') {
      sortedItems.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    } else if (surahSortMode === 'verses-asc') {
      sortedItems.sort((a, b) => a.verses - b.verses);
    } else if (surahSortMode === 'verses-desc') {
      sortedItems.sort((a, b) => b.verses - a.verses);
    } else {
      sortedItems.sort((a, b) => a.number - b.number);
    }

    return sortedItems;
  }, [
    normalizedCatalogSearch,
    selectedJuzFilter,
    selectedHizbFilter,
    hizbSurahNumbers,
    selectedSurahType,
    selectedSurahLength,
    surahSortMode
  ]);

  const filteredJuzNumbers = useMemo(() => {
    if (!normalizedCatalogSearch) {
      return juzNumbers;
    }

    return juzNumbers.filter((juzNumber) => {
      const startSurahName = surahs[firstSurahInJuz[juzNumber] - 1]?.name || '';
      const searchableText = [
        `الجزء ${juzNumber}`,
        `جزء ${juzNumber}`,
        `حزب ${Math.max(1, (juzNumber * 2) - 1)} إلى ${juzNumber * 2}`,
        `صورة الجزء ${juzNumber}`,
        `زخرفة الجزء ${juzNumber}`,
        `juz-${juzNumber}`,
        startSurahName
      ].map((text) => normalizeSearchText(text));

      return searchableText.some((text) => text.includes(normalizedCatalogSearch));
    });
  }, [juzNumbers, normalizedCatalogSearch, firstSurahInJuz]);

  const filteredHizbNumbers = useMemo(() => {
    if (!normalizedCatalogSearch) {
      return hizbNumbers;
    }

    return hizbNumbers.filter((hizbNumber) => {
      const relatedJuz = Math.ceil(hizbNumber / 2);
      const searchableText = [
        `الحزب ${hizbNumber}`,
        `حزب ${hizbNumber}`,
        `الجزء ${relatedJuz}`,
        `صورة الحزب ${hizbNumber}`,
        `زخرفة الحزب ${hizbNumber}`,
        `hizb-${hizbNumber}`
      ].map((text) => normalizeSearchText(text));

      return searchableText.some((text) => text.includes(normalizedCatalogSearch));
    });
  }, [hizbNumbers, normalizedCatalogSearch]);

  const filteredJuzNumbersComprehensive = useMemo(() => {
    if (selectedHizbFilter && !hizbSurahNumbers) {
      return [];
    }

    return filteredJuzNumbers.filter((juzNumber) => {
      const hasMatchingSurah = surahs.some((item) => {
        if (!item.juz.includes(juzNumber)) {
          return false;
        }
        if (selectedSurahType !== 'all' && item.type !== selectedSurahType) {
          return false;
        }
        if (selectedSurahLength !== 'all' && getSurahLengthBand(item.verses) !== selectedSurahLength) {
          return false;
        }
        return true;
      });

      if (!hasMatchingSurah) {
        return false;
      }

      if (selectedHizbFilter && hizbSurahNumbers) {
        return surahs.some(
          (item) => item.juz.includes(juzNumber) && hizbSurahNumbers.includes(item.number)
        );
      }

      return true;
    });
  }, [
    filteredJuzNumbers,
    selectedHizbFilter,
    hizbSurahNumbers,
    selectedSurahType,
    selectedSurahLength
  ]);

  const filteredHizbNumbersComprehensive = useMemo(() => {
    return filteredHizbNumbers.filter((hizbNumber) => {
      const relatedJuz = Math.ceil(hizbNumber / 2);
      if (selectedJuzFilter && relatedJuz !== selectedJuzFilter) {
        return false;
      }

      return surahs.some((item) => {
        if (!item.juz.includes(relatedJuz)) {
          return false;
        }
        if (selectedSurahType !== 'all' && item.type !== selectedSurahType) {
          return false;
        }
        if (selectedSurahLength !== 'all' && getSurahLengthBand(item.verses) !== selectedSurahLength) {
          return false;
        }
        return true;
      });
    });
  }, [filteredHizbNumbers, selectedJuzFilter, selectedSurahType, selectedSurahLength]);
  const surahLengthFilterLabel: Record<SurahLengthFilter, string> = {
    all: 'كل الأطوال',
    short: 'قصيرة',
    medium: 'متوسطة',
    long: 'طويلة'
  };
  const surahSortModeLabel: Record<SurahSortMode, string> = {
    mushaf: 'ترتيب المصحف',
    name: 'أبجدي',
    'verses-asc': 'الأقصر أولًا',
    'verses-desc': 'الأطول أولًا'
  };

  const activeCatalogFilters = useMemo(() => {
    const filters: Array<{ key: 'juz' | 'hizb' | 'search' | 'type' | 'length' | 'sort'; label: string }> = [];

    if (searchQuery.trim()) {
      filters.push({ key: 'search', label: `بحث: ${searchQuery.trim()}` });
    }
    if (selectedSurahType !== 'all') {
      filters.push({ key: 'type', label: `النوع: ${selectedSurahType}` });
    }
    if (selectedSurahLength !== 'all') {
      filters.push({ key: 'length', label: `الطول: ${surahLengthFilterLabel[selectedSurahLength]}` });
    }
    if (surahSortMode !== 'mushaf') {
      filters.push({ key: 'sort', label: `الترتيب: ${surahSortModeLabel[surahSortMode]}` });
    }
    if (selectedJuzFilter) {
      filters.push({ key: 'juz', label: `الجزء ${selectedJuzFilter}` });
    }
    if (selectedHizbFilter) {
      filters.push({ key: 'hizb', label: `الحزب ${selectedHizbFilter}` });
    }

    return filters;
  }, [searchQuery, selectedSurahType, selectedSurahLength, surahSortMode, selectedJuzFilter, selectedHizbFilter]);

  // Navigate to next/previous surah
  const nextSurah = () => {
    if (currentSurah < 114) {
      setCurrentSurah(currentSurah + 1);
      setCurrentVerse(1);
    }
  };

  const prevSurah = () => {
    if (currentSurah > 1) {
      setCurrentSurah(currentSurah - 1);
      setCurrentVerse(1);
    }
  };

  // Toggle favorite
  const toggleFavorite = () => {
    if (isFavorite) {
      removeFromFavorites(currentSurah);
    } else {
      addToFavorites(currentSurah);
    }
  };

  // Check if verse is bookmarked
  const isBookmarked = (verseNumber: number) => {
    return bookmarks.some(b => b.surah === currentSurah && b.verse === verseNumber);
  };

  // Add bookmark with note
  const handleAddBookmark = () => {
    addBookmark(currentSurah, currentVerse, bookmarkNote);
    setBookmarkNote('');
    setShowBookmarkDialog(false);
  };

  const buildSurahAudioUrl = (surahNumber: number, reciterId = selectedReciter) => {
    const reciterBase = RECITER_SURAH_AUDIO_BASE[reciterId] || RECITER_SURAH_AUDIO_BASE['7'];
    const surahPart = surahNumber.toString().padStart(3, '0');
    return `${reciterBase}${surahPart}.mp3`;
  };

  const openSurahFromCatalog = (surahNumber: number) => {
    setCurrentSurah(surahNumber);
    setCurrentVerse(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const playSurahFromCatalog = (surahNumber: number) => {
    setCurrentSurah(surahNumber);
    setCurrentVerse(1);
    playAudio(buildSurahAudioUrl(surahNumber));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handlePlayCurrentSurah = (reciterId = selectedReciter) => {
    playAudio(buildSurahAudioUrl(currentSurah, reciterId));
  };

  const clearCatalogFilters = () => {
    setSearchQuery('');
    setSelectedSurahType('all');
    setSelectedSurahLength('all');
    setSurahSortMode('mushaf');
    setSelectedJuzFilter(null);
    setSelectedHizbFilter(null);
    setHizbSurahNumbers(null);
    setHizbError(null);
  };

  const removeCatalogFilter = (key: 'search' | 'juz' | 'hizb' | 'type' | 'length' | 'sort') => {
    if (key === 'search') {
      setSearchQuery('');
      return;
    }

    if (key === 'type') {
      setSelectedSurahType('all');
      return;
    }

    if (key === 'length') {
      setSelectedSurahLength('all');
      return;
    }

    if (key === 'sort') {
      setSurahSortMode('mushaf');
      return;
    }

    if (key === 'juz') {
      setSelectedJuzFilter(null);
      return;
    }

    setSelectedHizbFilter(null);
    setHizbSurahNumbers(null);
    setHizbError(null);
  };

  const applyJuzFilter = (juzNumber: number) => {
    setSelectedJuzFilter(juzNumber);
    setSelectedHizbFilter(null);
    setHizbSurahNumbers(null);
    setHizbError(null);
    setCatalogView('surahs');
    const targetSurah = firstSurahInJuz[juzNumber] || 1;
    playSurahFromCatalog(targetSurah);
  };

  const applyHizbFilter = (hizbNumber: number) => {
    setSelectedHizbFilter(hizbNumber);
    setSelectedJuzFilter(null);
    setCatalogView('surahs');
    const fallbackJuz = Math.ceil(hizbNumber / 2);
    const cachedSurahs = hizbFilterCache.current[hizbNumber];
    const targetSurah = cachedSurahs?.[0] || firstSurahInJuz[fallbackJuz] || 1;
    playSurahFromCatalog(targetSurah);
  };

  useEffect(() => {
    const savedPosition = loadSavedReadingPosition();

    if (savedPosition) {
      pendingRestorePositionRef.current = savedPosition;
      if (savedPosition.surah !== currentSurah) {
        setCurrentSurah(savedPosition.surah);
      } else {
        setCurrentVerse(savedPosition.verse);
        pendingRestoreScrollVerseRef.current = savedPosition.verse;
        pendingRestorePositionRef.current = null;
      }
    }

    hasInitializedReadingRestoreRef.current = true;
  }, []);

  useEffect(() => {
    const updateLayoutMetrics = () => {
      const measuredHeaderHeight = headerRef.current?.getBoundingClientRect().height ?? (isMobile ? 88 : 92);
      const measuredAudioBarHeight = audioBarRef.current?.getBoundingClientRect().height ?? (isMobile ? 60 : 68);

      setLayoutMetrics((previous) => {
        const nextHeaderHeight = Math.round(measuredHeaderHeight);
        const nextAudioBarHeight = Math.round(measuredAudioBarHeight);

        if (
          previous.headerHeight === nextHeaderHeight &&
          previous.audioBarHeight === nextAudioBarHeight
        ) {
          return previous;
        }

        return {
          headerHeight: nextHeaderHeight,
          audioBarHeight: nextAudioBarHeight
        };
      });
    };

    updateLayoutMetrics();

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
        updateLayoutMetrics();
      })
      : null;

    if (observer) {
      if (headerRef.current) {
        observer.observe(headerRef.current);
      }
      if (audioBarRef.current) {
        observer.observe(audioBarRef.current);
      }
    }

    window.addEventListener('resize', updateLayoutMetrics);
    return () => {
      window.removeEventListener('resize', updateLayoutMetrics);
      observer?.disconnect();
    };
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = showSidebar ? 'hidden' : previousOverflow || '';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, showSidebar]);

  useEffect(() => {
    if (!selectedHizbFilter) {
      setIsLoadingHizb(false);
      setHizbError(null);
      setHizbSurahNumbers(null);
      return;
    }

    if (hizbFilterCache.current[selectedHizbFilter]) {
      setHizbSurahNumbers(hizbFilterCache.current[selectedHizbFilter]);
      setIsLoadingHizb(false);
      setHizbError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingHizb(true);
    setHizbError(null);

    fetch(`https://api.quran.com/api/v4/verses/by_hizb/${selectedHizbFilter}?language=ar&words=false&per_page=300`, {
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('failed');
        }
        return response.json() as Promise<HizbVersesResponse>;
      })
      .then((data) => {
        const surahNumbers = Array.from(
          new Set(
            data.verses
              .map((item) => Number(item.verse_key.split(':')[0]))
              .filter((value) => !Number.isNaN(value))
          )
        ).sort((a, b) => a - b);

        hizbFilterCache.current[selectedHizbFilter] = surahNumbers;
        setHizbSurahNumbers(surahNumbers);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setHizbSurahNumbers(null);
        setHizbError('تعذر تحميل بيانات الحزب حالياً. حاول مرة أخرى.');
        void error;
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingHizb(false);
        }
      });

    return () => controller.abort();
  }, [selectedHizbFilter]);

  useEffect(() => {
    let cancelled = false;
    const fallbackVerses = versesData[currentSurah] || [];

    setDisplayVerses(fallbackVerses);
    setVersesError(null);
    setIsLoadingVerses(true);
    const restoredVerse =
      pendingRestorePositionRef.current?.surah === currentSurah
        ? pendingRestorePositionRef.current.verse
        : 1;
    setCurrentVerse(restoredVerse);
    if (pendingRestorePositionRef.current?.surah === currentSurah) {
      pendingRestoreScrollVerseRef.current = restoredVerse;
      pendingRestorePositionRef.current = null;
    }
    setVerseSearchQuery('');
    verseRefs.current = {};

    fetchSurahVerses(currentSurah)
      .then((verses) => {
        if (cancelled) {
          return;
        }
        setDisplayVerses(verses);
        setVersesError(null);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        if (fallbackVerses.length === 0) {
          setDisplayVerses([]);
          setVersesError('تعذر تحميل نص السورة حالياً. تحقق من الاتصال بالإنترنت ثم حاول مرة أخرى.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingVerses(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentSurah, reloadToken]);

  useEffect(() => {
    if (!hasInitializedReadingRestoreRef.current) {
      return;
    }

    try {
      setStoredValue(
        READING_POSITION_STORAGE_KEY,
        JSON.stringify({ surah: currentSurah, verse: currentVerse })
      );
    } catch {
      // Ignore storage write failures and continue reading normally.
    }
  }, [currentSurah, currentVerse]);

  // Track reading progress
  useEffect(() => {
    if (filteredDisplayVerses.length === 0) {
      return;
    }

    const currentVerseExists = filteredDisplayVerses.some((verse) => verse.number === currentVerse);
    if (!currentVerseExists) {
      setCurrentVerse(filteredDisplayVerses[0].number);
    }
  }, [filteredDisplayVerses, currentVerse]);

  useEffect(() => {
    if (isLoadingVerses || filteredDisplayVerses.length === 0) {
      return;
    }

    const verseToScroll = pendingRestoreScrollVerseRef.current;
    if (!verseToScroll) {
      return;
    }

    const targetElement = verseRefs.current[verseToScroll];
    if (!targetElement) {
      return;
    }

    requestAnimationFrame(() => {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    pendingRestoreScrollVerseRef.current = null;
  }, [isLoadingVerses, filteredDisplayVerses]);

  useEffect(() => {
    if (filteredDisplayVerses.length === 0) {
      return;
    }

    const handleScroll = () => {
      for (const verse of filteredDisplayVerses) {
        const element = verseRefs.current[verse.number];
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
            setCurrentVerse(verse.number);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentSurah, filteredDisplayVerses]);

  return (
    <div className={`app-page-shell spiritual-page-bg transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-800'} ${isDesktopCatalog ? 'md:pr-[26rem]' : ''}`}>
      {/* Header */}
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 ${isDesktopCatalog ? 'md:right-[26rem]' : 'right-0'} z-[62] border-b backdrop-blur-xl shadow-sm ${darkMode ? 'bg-slate-900/78 border-slate-700' : 'bg-white/78 border-emerald-100'}`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMobile ? (
                <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9" onClick={() => setShowSidebar(true)}>
                  <List className="w-5 h-5" />
                </Button>
              ) : (
                <div
                  className={`hidden md:flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    darkMode ? 'border-slate-700 bg-slate-800 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>فهرس المصحف ظاهر</span>
                </div>
              )}
              <AppLogo size="sm" className="w-9 h-9 rounded-lg" />
               
              <div>
                <h1 className="text-base sm:text-lg font-bold">سورة {surah?.name}</h1>
                <p className={`text-[11px] sm:text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {surah?.verses} آية | {surah?.type}
                </p>
              </div>
            </div>
             
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9" onClick={toggleDarkMode}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
               
              <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9" onClick={toggleFavorite}>
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              </Button>
               
              <Dialog open={showBookmarkDialog} onOpenChange={setShowBookmarkDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9">
                    <Bookmark className={`w-4 h-4 ${isBookmarked(currentVerse) ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة إشارة مرجعية</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p>سورة {surah?.name} - آية {currentVerse}</p>
                    <Input 
                      placeholder="أضف ملاحظة (اختياري)"
                      value={bookmarkNote}
                      onChange={(e) => setBookmarkNote(e.target.value)}
                    />
                    <Button onClick={handleAddBookmark} className="w-full bg-emerald-600">
                      حفظ الإشارة
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2.5">
            <div className={`h-1 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-emerald-100'}`}>
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (currentVerse / totalVerses) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>آية {currentVerse}</span>
              <span>من {totalVerses} آية</span>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar - Quran Catalog */}
      {isMobile && showSidebar && (
        <button
          type="button"
          aria-label="إغلاق فهرس المصحف"
          onClick={() => setShowSidebar(false)}
          className="fixed inset-0 z-[65] bg-slate-950/20 backdrop-blur-[1px]"
        />
      )}
      <div
        className={`fixed inset-y-0 ${sidebarPositionClass} z-[70] w-full md:w-[26rem] transition-[right] duration-300 ${isDesktopCatalog ? 'shadow-2xl md:rounded-3xl md:overflow-hidden' : ''} ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white/95 border-emerald-100'} ${isMobile ? 'border-0 rounded-none' : 'border'} flex flex-col overflow-hidden backdrop-blur-sm`}
        style={{ top: sidebarTopInset, bottom: sidebarBottomInset }}
      >
        <div className={`shrink-0 p-4 ${isMobile ? 'pt-[calc(1rem+env(safe-area-inset-top))]' : ''} border-b ${darkMode ? 'border-slate-700' : 'border-emerald-100'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <AppLogo size="sm" className="w-9 h-9 rounded-xl mt-0.5" />
              <div className="min-w-0">
                <h2 className="text-xl font-bold">فهرس المصحف</h2>
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  السور - الأجزاء - الأحزاب
                </p>
              </div>
            </div>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)}>
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          <div className={`mt-3 rounded-2xl border px-3 py-2.5 shadow-sm ring-1 ${darkMode ? 'border-slate-700 bg-slate-800/70 ring-slate-700/60' : 'border-emerald-100 bg-emerald-50/80 ring-emerald-100/80'}`}>
            <div className="flex items-center justify-between text-xs">
              <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>السورة الحالية</span>
              <span className={`rounded-full px-2 py-0.5 ${darkMode ? 'bg-slate-700 text-emerald-300' : 'bg-white text-emerald-700 border border-emerald-200'}`}>
                {Math.round((currentVerse / totalVerses) * 100)}%
              </span>
            </div>
            <p className="mt-1 font-bold text-sm">سورة {surah?.name}</p>
            <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              اختر من الفهرس للانتقال السريع أثناء القراءة
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className={`text-[11px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                القارئ: {selectedReciterName}
              </p>
              <Button
                size="sm"
                className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handlePlayCurrentSurah()}
              >
                <Play className="w-3 h-3 ml-1" />
                استمع
              </Button>
            </div>
          </div>
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            paddingTop: '0.5rem',
            paddingBottom: isMobile ? 'calc(1rem + env(safe-area-inset-bottom))' : '1.25rem',
            scrollPaddingTop: '1rem',
            scrollPaddingBottom: isMobile ? 'calc(2.5rem + env(safe-area-inset-bottom))' : '3rem'
          }}
        >
        <div className={`p-3 border-b ${darkMode ? 'border-slate-700' : 'border-emerald-100'}`}>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={catalogView === 'surahs' ? 'default' : 'outline'}
              size="sm"
              className={catalogView === 'surahs' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={() => setCatalogView('surahs')}
            >
              السور
            </Button>
            <Button
              variant={catalogView === 'juz' ? 'default' : 'outline'}
              size="sm"
              className={catalogView === 'juz' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={() => setCatalogView('juz')}
            >
              الأجزاء
            </Button>
            <Button
              variant={catalogView === 'hizb' ? 'default' : 'outline'}
              size="sm"
              className={catalogView === 'hizb' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={() => setCatalogView('hizb')}
            >
              الأحزاب
            </Button>
          </div>
        </div>

        <div className={`p-3 border-b space-y-2 ${darkMode ? 'border-slate-700' : 'border-emerald-100'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={
                catalogView === 'surahs'
                  ? 'ابحث باسم السورة أو اسم الصورة...'
                  : catalogView === 'juz'
                    ? 'ابحث باسم الجزء أو اسم الصورة...'
                    : 'ابحث باسم الحزب أو اسم الصورة...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            البحث يدعم: أسماء السور، الأجزاء، الأحزاب، وأسماء الصور.
          </p>
        </div>

        <div className={`p-3 border-b ${darkMode ? 'border-slate-700' : 'border-emerald-100'}`}>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCatalogView('surahs')}
              className={`rounded-lg border p-2 text-center transition-colors ${
                catalogView === 'surahs'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : darkMode
                    ? 'border-slate-700 hover:bg-slate-800'
                    : 'border-emerald-100 hover:bg-emerald-50'
              }`}
            >
              <p className="text-sm font-bold">{surahs.length}</p>
              <p className="text-[11px]">سور</p>
            </button>
            <button
              type="button"
              onClick={() => setCatalogView('juz')}
              className={`rounded-lg border p-2 text-center transition-colors ${
                catalogView === 'juz'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : darkMode
                    ? 'border-slate-700 hover:bg-slate-800'
                    : 'border-emerald-100 hover:bg-emerald-50'
              }`}
            >
              <p className="text-sm font-bold">{juzNumbers.length}</p>
              <p className="text-[11px]">أجزاء</p>
            </button>
            <button
              type="button"
              onClick={() => setCatalogView('hizb')}
              className={`rounded-lg border p-2 text-center transition-colors ${
                catalogView === 'hizb'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : darkMode
                    ? 'border-slate-700 hover:bg-slate-800'
                    : 'border-emerald-100 hover:bg-emerald-50'
              }`}
            >
              <p className="text-sm font-bold">{hizbNumbers.length}</p>
              <p className="text-[11px]">أحزاب</p>
            </button>
          </div>
        </div>

        {catalogView === 'surahs' && (
          <div>
            <div className={`p-4 border-b space-y-4 ${darkMode ? 'border-slate-700' : 'border-emerald-100'}`}>
              <div className={`rounded-xl border px-3 py-2 ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-emerald-100 bg-white/80'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    أدوات الفلاتر
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px]"
                    onClick={clearCatalogFilters}
                  >
                    تصفير
                  </Button>
                </div>
                <p className={`mt-1 text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  كل الفلاتر ظاهرة بالأسفل مباشرة.
                </p>
              </div>

              <>
              <div className={`rounded-2xl border p-3 shadow-sm ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-emerald-100 bg-emerald-50/40'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-xs font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      لوحة الفلاتر الذكية
                    </p>
                    <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      اختَر طريقة عرض السور ثم صفِّ النتائج حسب النوع والطول والترتيب.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[11px] rounded-full px-2 py-0.5 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white border border-emerald-200 text-emerald-700'}`}>
                      {filteredSurahs.length}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={clearCatalogFilters}
                    >
                      إعادة ضبط
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className={`rounded-lg border p-2 text-center ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-emerald-100 bg-white/90'}`}>
                    <p className="text-xs font-bold">{filteredSurahs.length}</p>
                    <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>سور</p>
                  </div>
                  <div className={`rounded-lg border p-2 text-center ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-emerald-100 bg-white/90'}`}>
                    <p className="text-xs font-bold">{filteredJuzNumbersComprehensive.length}</p>
                    <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>أجزاء</p>
                  </div>
                  <div className={`rounded-lg border p-2 text-center ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-emerald-100 bg-white/90'}`}>
                    <p className="text-xs font-bold">{filteredHizbNumbersComprehensive.length}</p>
                    <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>أحزاب</p>
                  </div>
                </div>

                <div className="mt-3 space-y-4">
                  <div>
                    <p className={`text-[11px] font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>نوع السورة</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {(['all', 'مكية', 'مدنية'] as SurahTypeFilter[]).map((typeOption) => (
                        <button
                          key={typeOption}
                          type="button"
                          onClick={() => setSelectedSurahType(typeOption)}
                          className={`w-full min-h-[2rem] rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                            selectedSurahType === typeOption
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300'
                              : darkMode
                                ? 'border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800'
                                : 'border-emerald-100 bg-white text-slate-700 hover:bg-emerald-50'
                          }`}
                        >
                          {typeOption === 'all' ? 'الكل' : typeOption}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className={`text-[11px] font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>طول السورة</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      {([
                        ['all', 'الكل'],
                        ['short', 'قصيرة'],
                        ['medium', 'متوسطة'],
                        ['long', 'طويلة']
                      ] as Array<[SurahLengthFilter, string]>).map(([lengthOption, label]) => (
                        <button
                          key={lengthOption}
                          type="button"
                          onClick={() => setSelectedSurahLength(lengthOption)}
                          className={`w-full min-h-[2rem] rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                            selectedSurahLength === lengthOption
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300'
                              : darkMode
                                ? 'border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800'
                                : 'border-emerald-100 bg-white text-slate-700 hover:bg-emerald-50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className={`text-[11px] font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>ترتيب العرض</p>
                    <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch">
                      {([
                        ['mushaf', 'ترتيب المصحف'],
                        ['name', 'أبجدي'],
                        ['verses-asc', 'الأقصر أولًا'],
                        ['verses-desc', 'الأطول أولًا']
                      ] as Array<[SurahSortMode, string]>).map(([sortOption, label]) => (
                        <button
                          key={sortOption}
                          type="button"
                          onClick={() => setSurahSortMode(sortOption)}
                          className={`rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                            surahSortMode === sortOption
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300'
                              : darkMode
                                ? 'border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800'
                                : 'border-emerald-100 bg-white text-slate-700 hover:bg-emerald-50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border p-3 shadow-sm ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-emerald-100 bg-emerald-50/40'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-xs font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      فلتر الأجزاء المصور
                    </p>
                    <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      اسحب لأعلى وأسفل لاختيار الجزء المطلوب بسرعة
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] rounded-full px-2 py-0.5 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white border border-emerald-200 text-emerald-700'}`}>
                      {filteredJuzNumbersComprehensive.length}
                    </span>
                    {selectedJuzFilter && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setSelectedJuzFilter(null)}>
                        مسح
                      </Button>
                    )}
                  </div>
                </div>

                <div
                  className={`mt-2 h-[16.5rem] md:h-56 overflow-y-auto overflow-x-hidden overscroll-y-contain custom-scrollbar rounded-xl border p-2 pr-1 ${
                    darkMode ? 'border-slate-700 bg-slate-950/40' : 'border-emerald-100 bg-white/80'
                  }`}
                  style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
                >
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedJuzFilter(null)}
                      className={`group w-full min-w-0 min-h-[5.5rem] rounded-xl border p-2 text-right text-xs transition-all overflow-hidden ${
                        !selectedJuzFilter
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/25 ring-1 ring-emerald-400/40'
                          : darkMode
                            ? 'border-slate-700 bg-slate-900/40 hover:bg-slate-800'
                            : 'border-emerald-100 bg-white hover:bg-emerald-50'
                      }`}
                    >
                      <img
                        src={getCatalogImage('juz', 'كل الأجزاء')}
                        alt="كل الأجزاء"
                        className="w-full h-10 rounded-lg object-cover mb-2"
                      />
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="min-w-0 font-semibold truncate">كل الأجزاء</span>
                        <span className={`text-[10px] rounded-full px-1.5 py-0.5 shrink-0 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-emerald-100 text-emerald-700'}`}>
                          {juzNumbers.length}
                        </span>
                      </div>
                      <p className={`mt-1 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        عرض جميع الأجزاء
                      </p>
                    </button>
                    {filteredJuzNumbersComprehensive.map((juzNumber) => (
                      <button
                        key={juzNumber}
                        type="button"
                        onClick={() => applyJuzFilter(juzNumber)}
                        className={`group w-full min-w-0 min-h-[5.5rem] rounded-xl border p-2 text-right text-xs transition-all overflow-hidden ${
                          selectedJuzFilter === juzNumber
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/25 ring-1 ring-emerald-400/40'
                            : darkMode
                              ? 'border-slate-700 bg-slate-900/40 hover:bg-slate-800'
                              : 'border-emerald-100 bg-white hover:bg-emerald-50'
                        }`}
                        >
                          <img
                            src={getCatalogImage('juz', `الجزء ${juzNumber}`, juzNumber)}
                            alt={`فلتر الجزء ${juzNumber}`}
                            className="w-full h-10 rounded-lg object-cover mb-2"
                          />
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <span className="min-w-0 font-semibold truncate">الجزء {juzNumber}</span>
                            <span className={`text-[10px] rounded-full px-1.5 py-0.5 shrink-0 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-emerald-100 text-emerald-700'}`}>
                              {surahCountInJuz[juzNumber]} س
                            </span>
                          </div>
                          <p className={`mt-1 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            عدد السور داخل الجزء
                          </p>
                        </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border p-3 shadow-sm ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-emerald-100 bg-emerald-50/40'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-xs font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      فلتر الأحزاب المصور
                    </p>
                    <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      اسحب لأعلى وأسفل لاختيار الحزب المناسب
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] rounded-full px-2 py-0.5 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white border border-emerald-200 text-emerald-700'}`}>
                      {filteredHizbNumbersComprehensive.length}
                    </span>
                    {selectedHizbFilter && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setSelectedHizbFilter(null)}>
                        مسح
                      </Button>
                    )}
                  </div>
                </div>

                <div
                  className={`mt-2 h-[16.5rem] md:h-56 overflow-y-auto overflow-x-hidden overscroll-y-contain custom-scrollbar rounded-xl border p-2 pr-1 ${
                    darkMode ? 'border-slate-700 bg-slate-950/40' : 'border-emerald-100 bg-white/80'
                  }`}
                  style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
                >
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedHizbFilter(null)}
                      className={`group w-full min-w-0 min-h-[5.5rem] rounded-xl border p-2 text-right text-xs transition-all overflow-hidden ${
                        !selectedHizbFilter
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/25 ring-1 ring-emerald-400/40'
                          : darkMode
                            ? 'border-slate-700 bg-slate-900/40 hover:bg-slate-800'
                            : 'border-emerald-100 bg-white hover:bg-emerald-50'
                      }`}
                    >
                      <img
                        src={getCatalogImage('hizb', 'كل الأحزاب')}
                        alt="كل الأحزاب"
                        className="w-full h-10 rounded-lg object-cover mb-2"
                      />
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="min-w-0 font-semibold truncate">كل الأحزاب</span>
                        <span className={`text-[10px] rounded-full px-1.5 py-0.5 shrink-0 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-emerald-100 text-emerald-700'}`}>
                          {hizbNumbers.length}
                        </span>
                      </div>
                      <p className={`mt-1 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        عرض جميع الأحزاب
                      </p>
                    </button>
                    {filteredHizbNumbersComprehensive.map((hizbNumber) => (
                      <button
                        key={hizbNumber}
                        type="button"
                        onClick={() => applyHizbFilter(hizbNumber)}
                        className={`group w-full min-w-0 min-h-[5.5rem] rounded-xl border p-2 text-right text-xs transition-all overflow-hidden ${
                          selectedHizbFilter === hizbNumber
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/25 ring-1 ring-emerald-400/40'
                            : darkMode
                              ? 'border-slate-700 bg-slate-900/40 hover:bg-slate-800'
                              : 'border-emerald-100 bg-white hover:bg-emerald-50'
                        }`}
                        >
                          <img
                            src={getCatalogImage('hizb', `الحزب ${hizbNumber}`, hizbNumber)}
                            alt={`فلتر الحزب ${hizbNumber}`}
                            className="w-full h-10 rounded-lg object-cover mb-2"
                          />
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <span className="min-w-0 font-semibold truncate">الحزب {hizbNumber}</span>
                            <span className={`text-[10px] rounded-full px-1.5 py-0.5 shrink-0 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-emerald-100 text-emerald-700'}`}>
                              جزء {Math.ceil(hizbNumber / 2)}
                            </span>
                          </div>
                          <p className={`mt-1 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            موضع الحزب في الأجزاء
                          </p>
                        </button>
                    ))}
                  </div>
                </div>
              </div>
              </>

              {activeCatalogFilters.length > 0 && (
                <div className={`rounded-xl border p-2.5 ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-emerald-100 bg-white/80'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      الفلاتر النشطة
                    </p>
                    <span className={`text-[10px] rounded-full px-2 py-0.5 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-emerald-100 text-emerald-700'}`}>
                      {activeCatalogFilters.length}
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {activeCatalogFilters.map((filter) => (
                      <button
                        type="button"
                        key={filter.key + filter.label}
                        onClick={() => removeCatalogFilter(filter.key)}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] ${
                          darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <span>{filter.label}</span>
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                  النتائج: {filteredSurahs.length} سورة
                </span>
                {(searchQuery || selectedJuzFilter || selectedHizbFilter || selectedSurahType !== 'all' || selectedSurahLength !== 'all' || surahSortMode !== 'mushaf') && (
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={clearCatalogFilters}>
                    تصفير الفلاتر
                  </Button>
                )}
              </div>

              {selectedHizbFilter && isLoadingHizb && (
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  جاري تحميل السور الخاصة بالحزب {selectedHizbFilter}...
                </p>
              )}

              {hizbError && (
                <p className="text-xs text-rose-500">{hizbError}</p>
              )}
            </div>

            <div>
              <div className="p-3 sm:p-4 space-y-3">
                {filteredSurahs.map((item) => (
                  <div
                    key={item.number}
                    className={`rounded-xl border p-2.5 sm:p-3 cursor-pointer transition-all overflow-hidden ${
                      currentSurah === item.number
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm ring-1 ring-emerald-400/40'
                        : darkMode
                          ? 'border-slate-700 hover:bg-slate-800'
                          : 'border-emerald-100 hover:bg-emerald-50'
                    }`}
                    onClick={() => openSurahFromCatalog(item.number)}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                      <div className={`w-1 self-stretch rounded-full ${currentSurah === item.number ? 'bg-emerald-500' : darkMode ? 'bg-slate-700' : 'bg-emerald-100'}`} />
                      <img
                        src={getCatalogImage('surah', `سورة ${item.name}`, item.number)}
                        alt={`صورة سورة ${item.name}`}
                        className="w-14 h-11 sm:w-16 sm:h-12 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold truncate">سورة {item.name}</p>
                            {currentSurah === item.number && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">جاري القراءة الآن</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {item.number}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {item.verses} آية - الأجزاء: {item.juz.join('، ')}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                          <span className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-amber-50 text-amber-700'}`}>
                            {item.type}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-emerald-50 text-emerald-700'}`}>
                            {item.juz.length} جزء
                          </span>
                        </div>
                        <p className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          اسم الصورة: زخرفة سورة {item.name}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={currentSurah === item.number ? 'default' : 'outline'}
                            className={currentSurah === item.number ? 'h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700' : 'h-7 px-2 text-[11px]'}
                            onClick={(event) => {
                              event.stopPropagation();
                              openSurahFromCatalog(item.number);
                            }}
                          >
                            قراءة
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={(event) => {
                              event.stopPropagation();
                              playSurahFromCatalog(item.number);
                            }}
                          >
                            <Play className="w-3 h-3 ml-1" />
                            استماع
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredSurahs.length === 0 && !isLoadingHizb && (
                  <p className={`text-sm text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    لا توجد سور مطابقة للفلاتر الحالية.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {catalogView === 'juz' && (
          <div>
            <div className={`px-4 py-2 border-b text-xs flex items-center justify-between ${darkMode ? 'border-slate-700 text-slate-300' : 'border-emerald-100 text-slate-600'}`}>
              <span>نتائج الأجزاء: {filteredJuzNumbersComprehensive.length}</span>
              {(searchQuery.trim() || selectedSurahType !== 'all' || selectedSurahLength !== 'all' || selectedHizbFilter || surahSortMode !== 'mushaf') && (
                <span>فلترة نشطة</span>
              )}
            </div>
              <div className="p-4 grid grid-cols-2 gap-3">
              {filteredJuzNumbersComprehensive.map((juzNumber) => (
                <button
                  key={juzNumber}
                  type="button"
                  onClick={() => applyJuzFilter(juzNumber)}
                  className={`rounded-2xl border p-3.5 text-right transition-all ${
                    selectedJuzFilter === juzNumber
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-400/40'
                      : darkMode
                        ? 'border-slate-700 hover:bg-slate-800'
                        : 'border-emerald-100 hover:bg-emerald-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-sm">الجزء {juzNumber}</p>
                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-emerald-100 text-emerald-700'}`}>
                      {surahCountInJuz[juzNumber]} سورة
                    </span>
                  </div>
                  <img
                    src={getCatalogImage('juz', `الجزء ${juzNumber}`, juzNumber)}
                    alt={`صورة الجزء ${juzNumber}`}
                    className="w-full h-16 rounded-xl object-cover mb-2.5"
                  />
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    يبدأ من سورة {surahs[firstSurahInJuz[juzNumber] - 1]?.name}
                  </p>
                  <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    الأحزاب: {Math.max(1, (juzNumber * 2) - 1)} - {juzNumber * 2}
                  </p>
                </button>
              ))}

              {filteredJuzNumbersComprehensive.length === 0 && (
                <p className={`col-span-2 text-sm text-center py-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  لا توجد أجزاء مطابقة لبحثك.
                </p>
              )}
              </div>
          </div>
        )}

        {catalogView === 'hizb' && (
          <div>
            <div className={`px-4 py-2 border-b text-xs flex items-center justify-between ${darkMode ? 'border-slate-700 text-slate-300' : 'border-emerald-100 text-slate-600'}`}>
              <span>نتائج الأحزاب: {filteredHizbNumbersComprehensive.length}</span>
              {(searchQuery.trim() || selectedSurahType !== 'all' || selectedSurahLength !== 'all' || selectedJuzFilter || surahSortMode !== 'mushaf') && (
                <span>فلترة نشطة</span>
              )}
            </div>
              <div className="p-4 grid grid-cols-2 gap-3">
              {filteredHizbNumbersComprehensive.map((hizbNumber) => (
                <button
                  key={hizbNumber}
                  type="button"
                  onClick={() => applyHizbFilter(hizbNumber)}
                  className={`rounded-lg border p-2 text-right transition-colors ${
                    selectedHizbFilter === hizbNumber
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : darkMode
                        ? 'border-slate-700 hover:bg-slate-800'
                        : 'border-emerald-100 hover:bg-emerald-50'
                  }`}
                >
                  <img
                    src={getCatalogImage('hizb', `الحزب ${hizbNumber}`, hizbNumber)}
                    alt={`صورة الحزب ${hizbNumber}`}
                    className="w-full h-10 rounded-md object-cover mb-2"
                  />
                  <p className="text-sm font-semibold">الحزب {hizbNumber}</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>عرض السور التابعة له</p>
                  <p className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>اسم الصورة: زخرفة الحزب {hizbNumber}</p>
                </button>
              ))}

              {filteredHizbNumbersComprehensive.length === 0 && (
                <p className={`col-span-2 text-sm text-center py-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  لا توجد أحزاب مطابقة لبحثك.
                </p>
              )}
              </div>
          </div>
        )}
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إعدادات العرض</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Font Size */}
            <div>
              <label className="flex items-center gap-2 mb-3">
                <Type className="w-4 h-4" />
                حجم الخط
              </label>
              <Slider 
                value={[fontSize]} 
                onValueChange={(v) => setFontSize(v[0])}
                min={16} 
                max={48} 
                step={2}
              />
              <p className="text-center mt-2 text-sm text-slate-500">{fontSize}px</p>
            </div>
            
            {/* Translation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4" />
                إظهار الترجمة
              </div>
              <Button variant={showTranslation ? 'default' : 'outline'} onClick={toggleTranslation}>
                {showTranslation ? 'مفعل' : 'معطل'}
              </Button>
            </div>
            
            {/* Reciter Selection */}
            <div>
              <label className="flex items-center gap-2 mb-3">
                <Volume2 className="w-4 h-4" />
                القارئ
              </label>
              <select 
                value={selectedReciter}
                onChange={(e) => {
                  const nextReciter = e.target.value;
                  setSelectedReciter(nextReciter);
                  handlePlayCurrentSurah(nextReciter);
                }}
                className="w-full p-2 rounded-lg border"
              >
                {reciters.map(r => (
                  <option key={r.id} value={r.id}>{r.nameArabic}</option>
                ))}
              </select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main
        className="max-w-4xl mx-auto px-3 sm:px-4"
        style={{ paddingTop: mainTopInset, paddingBottom: mainBottomInset }}
      >
        <PageInfoPanel
          darkMode={darkMode}
          accent="emerald"
          className="mb-6"
          title="معلومات صفحة القراءة"
          description="اقرأ السورة بشكل متصل، واستخدم الفهرس والبحث للوصول السريع لأي موضع داخل المصحف."
          tips={[
            'بدّل بين السور، الأجزاء، والأحزاب من الفهرس الجانبي.',
            'اضغط رقم الآية لتثبيت موضع القراءة بسرعة.',
            'احفظ مرجعًا للعودة لاحقًا من نفس الموضع.'
          ]}
          stats={readerInfoStats}
        />

        {/* Bismillah */}
        {currentSurah !== 1 && currentSurah !== 9 && (
          <div className="text-center mb-8">
            <p className="text-2xl sm:text-3xl font-arabic text-emerald-700 dark:text-emerald-300 mb-2">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
            <div className="dhikr-strip mx-auto max-w-2xl rounded-xl px-3 py-2 text-sm sm:text-base">
              ﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾
            </div>
          </div>
        )}

        {/* Surah Info Card */}
        <Card className="mb-8 spiritual-surface">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-1">سورة {surah?.name}</h2>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {surah?.englishName}
                </p>
              </div>
              <Badge className="bg-emerald-500">{surah?.type}</Badge>
            </div>
            
            <p className={`mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {surah?.description}
            </p>
            
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-emerald-50'}`}>
              <p className="text-sm font-semibold mb-1">فضل السورة:</p>
              <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {surah?.virtues}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Guide */}
        <Card className="mb-6 overflow-hidden spiritual-surface">
          <div className={`px-4 py-3 border-b ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-emerald-100 bg-emerald-50/70'}`}>
            <h3 className="font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              دليل قراءة سريع
            </h3>
          </div>
          <CardContent className="p-4 space-y-4">
            <div className="sm:hidden space-y-2">
              <div className={`rounded-xl p-3 border ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-emerald-100 bg-emerald-50'}`}>
                1) اختر السورة من القائمة الجانبية.
              </div>
              <div className={`rounded-xl p-3 border ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-emerald-100 bg-emerald-50'}`}>
                2) استخدم البحث للوصول للآية بسرعة.
              </div>
              <div className={`rounded-xl p-3 border ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-emerald-100 bg-emerald-50'}`}>
                3) احفظ موضعك بعلامة مرجعية.
              </div>
            </div>

            <div className="hidden sm:grid sm:grid-cols-3 gap-3">
              <div className={`rounded-xl p-3 border ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-emerald-100 bg-emerald-50'}`}>
                <p className="text-xs mb-1 text-emerald-600 font-semibold">الخطوة 1</p>
                <p className="text-sm font-medium">اختر السورة من القائمة الجانبية.</p>
              </div>
              <div className={`rounded-xl p-3 border ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-emerald-100 bg-emerald-50'}`}>
                <p className="text-xs mb-1 text-emerald-600 font-semibold">الخطوة 2</p>
                <p className="text-sm font-medium">استخدم البحث للوصول لآية بسرعة.</p>
              </div>
              <div className={`rounded-xl p-3 border ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-emerald-100 bg-emerald-50'}`}>
                <p className="text-xs mb-1 text-emerald-600 font-semibold">الخطوة 3</p>
                <p className="text-sm font-medium">احفظ علامة للرجوع لنفس الموضع.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
              {isMobile ? (
                <Button variant="outline" size="sm" onClick={() => setShowSidebar(true)}>
                  افتح قائمة السور
                </Button>
              ) : (
                <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold ${darkMode ? 'border-slate-700 bg-slate-900 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  فهرس المصحف ظاهر دائمًا يمين الصفحة
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowBookmarkDialog(true)}>
                احفظ موضع القراءة
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                رجوع للأعلى
              </Button>
            </div>

            <div>
              <p className={`text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                انتقال سريع لسور شائعة:
              </p>
              <div className="flex flex-wrap gap-2">
                {quickJumpSurahs.map((quickSurah) => (
                  <Button
                    key={quickSurah.number}
                    variant={quickSurah.number === currentSurah ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCurrentSurah(quickSurah.number);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={quickSurah.number === currentSurah ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  >
                    {quickSurah.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verse Search */}
        <Card className="mb-6 spiritual-surface">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="ابحث داخل آيات السورة أو برقم الآية..."
                value={verseSearchQuery}
                onChange={(e) => setVerseSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {normalizedVerseSearchQuery && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                  نتائج البحث: {filteredDisplayVerses.length} آية
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVerseSearchQuery('')}
                  className="h-8 px-2"
                >
                  مسح
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verses */}
        <div className="space-y-6">
          {isLoadingVerses && displayVerses.length === 0 && (
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardContent className="p-8 text-center text-sm text-slate-500">
                جاري تحميل نص السورة بالكامل...
              </CardContent>
            </Card>
          )}

          {versesError && !isLoadingVerses && displayVerses.length === 0 && (
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-rose-100'}`}>
              <CardContent className="p-8 text-center space-y-4">
                <p className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                  {versesError}
                </p>
                <Button onClick={() => setReloadToken((prev) => prev + 1)} className="bg-emerald-600">
                  إعادة المحاولة
                </Button>
              </CardContent>
            </Card>
          )}

          {normalizedVerseSearchQuery && filteredDisplayVerses.length === 0 && displayVerses.length > 0 && (
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-100'}`}>
              <CardContent className="p-8 text-center text-sm text-slate-500">
                لا توجد نتائج مطابقة للبحث داخل هذه السورة.
              </CardContent>
            </Card>
          )}

          {filteredDisplayVerses.length > 0 && (
            <Card className="spiritual-surface">
              <CardContent className="p-4 sm:p-6">
                <div className={`flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b ${darkMode ? 'border-slate-700' : 'border-emerald-100'}`}>
                  <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    عرض متصل للآيات - اضغط رقم الآية لتحديدها
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        isBookmarked(currentVerse)
                          ? removeBookmark(currentSurah, currentVerse)
                          : addBookmark(currentSurah, currentVerse)
                      }
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked(currentVerse) ? 'fill-amber-500 text-amber-500' : ''}`} />
                      {isBookmarked(currentVerse) ? 'إزالة العلامة' : 'حفظ موضع'}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => (isPlaying ? pauseAudio() : handlePlayCurrentSurah())}>
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <p
                  className="text-right leading-[2.4] sm:leading-[2.8] font-arabic"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {filteredDisplayVerses.map((verse) => (
                    <span
                      key={verse.number}
                      className={`inline ${
                        currentVerse === verse.number
                          ? darkMode
                            ? 'bg-emerald-900/30 rounded-md px-1'
                            : 'bg-emerald-50 rounded-md px-1'
                          : ''
                      }`}
                    >
                      {verse.text}
                      <button
                        type="button"
                        ref={(el) => {
                          verseRefs.current[verse.number] = el;
                        }}
                        onClick={() => setCurrentVerse(verse.number)}
                        aria-label={`انتقال إلى الآية ${verse.number}`}
                        className={`align-middle inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 mx-1 rounded-full text-xs sm:text-sm transition-colors ${
                          currentVerse === verse.number
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {verse.number}
                      </button>{' '}
                    </span>
                  ))}
                </p>

                {showTranslation && currentVerseData?.translation && (
                  <div className={`mt-5 border-t pt-4 ${darkMode ? 'border-slate-700' : 'border-emerald-100'}`}>
                    <p className={`text-xs mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      ترجمة الآية {currentVerseData.number}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {currentVerseData.translation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 sm:flex sm:items-center sm:justify-between gap-3 mt-8">
          <Button 
            variant="outline" 
            onClick={prevSurah}
            disabled={currentSurah === 1}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <ChevronRight className="w-4 h-4" />
            السورة السابقة
          </Button>
          
          <Button 
            variant="outline" 
            onClick={nextSurah}
            disabled={currentSurah === 114}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            السورة التالية
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </main>

      {/* Audio Player Bar */}
      <div
        ref={audioBarRef}
        className={`fixed left-0 ${isDesktopCatalog ? 'md:right-[26rem]' : 'right-0'} z-[58] border-t ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-emerald-100'} ${isMobile ? 'px-3 py-2' : 'p-4'}`}
        style={{ bottom: audioBarBottomInset }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Button size="icon" variant="outline" onClick={() => (isPlaying ? pauseAudio() : handlePlayCurrentSurah())}>
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            
            <div className="min-w-0">
              <p className="font-semibold text-sm sm:text-base truncate">{selectedReciterName}</p>
              <p className="text-xs sm:text-sm text-slate-500 truncate">سورة {surah?.name}</p>
            </div>
          </div>
          
          {!isMobile && (
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <Slider defaultValue={[50]} max={100} className="w-24" />
            </div>
          )}
        </div>
      </div>

      {isMobile && !showSidebar && (
        <Button
          size="sm"
          onClick={() => setShowSidebar(true)}
          className="fixed right-3 z-40 rounded-full bg-emerald-600 px-4 shadow-lg hover:bg-emerald-700"
          style={{ bottom: mobileCatalogButtonBottomInset }}
        >
          <List className="w-4 h-4 ml-1" />
          فهرس المصحف
        </Button>
      )}

    </div>
  );
}
