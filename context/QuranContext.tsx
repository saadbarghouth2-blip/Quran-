import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { surahs, dailyChallenges, achievements, titles } from '@/data/quran';
import { getStoredValue, setStoredValue } from '@/lib/user-storage';

export type UserActivityType = 'reading' | 'memorization' | 'challenge' | 'favorite' | 'bookmark' | 'achievement';

export interface UserActivity {
  type: UserActivityType;
  date: string;
  surah?: number;
  verse?: number;
  verses?: number;
  challengeId?: number;
  achievementId?: number;
}

interface UserProgress {
  points: number;
  level: number;
  title: string;
  streak: number;
  lastRead: string;
  totalRead: number;
  memorizedSurahs: number[];
  completedChallenges: number[];
  unlockedAchievements: number[];
  favoriteSurahs: number[];
  readingHistory: { date: string; surah: number; verses: number }[];
  activityTimeline: UserActivity[];
}

interface QuranContextType {
  // User Data
  userProgress: UserProgress;
  addPoints: (points: number) => void;
  completeChallenge: (challengeId: number) => void;
  unlockAchievement: (achievementId: number) => void;
  addToMemorized: (surahNumber: number) => void;
  addToFavorites: (surahNumber: number) => void;
  removeFromFavorites: (surahNumber: number) => void;
  updateStreak: () => void;
  addReadingHistory: (surah: number, verses: number) => void;
  
  // Settings
  darkMode: boolean;
  toggleDarkMode: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  showTranslation: boolean;
  toggleTranslation: () => void;
  selectedReciter: string;
  setSelectedReciter: (reciterId: string) => void;
  
  // Audio
  isPlaying: boolean;
  currentAudio: string | null;
  playAudio: (url: string) => void;
  pauseAudio: () => void;
  stopAudio: () => void;
  
  // Navigation
  currentSurah: number;
  setCurrentSurah: (surah: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  
  // Bookmarks
  bookmarks: { surah: number; verse: number; note?: string }[];
  addBookmark: (surah: number, verse: number, note?: string) => void;
  removeBookmark: (surah: number, verse: number) => void;
}

const defaultUserProgress: UserProgress = {
  points: 0,
  level: 1,
  title: 'المنطلق',
  streak: 0,
  lastRead: '',
  totalRead: 0,
  memorizedSurahs: [],
  completedChallenges: [],
  unlockedAchievements: [],
  favoriteSurahs: [],
  readingHistory: [],
  activityTimeline: []
};

const CURRENT_SURAH_STORAGE_KEY = 'quranCurrentSurah';
const CURRENT_PAGE_STORAGE_KEY = 'quranCurrentPage';
const MAX_READING_HISTORY = 100;
const MAX_ACTIVITY_TIMELINE = 120;

function normalizeUserProgress(input: Partial<UserProgress> | null | undefined): UserProgress {
  const merged = { ...defaultUserProgress, ...(input ?? {}) };
  const normalizedTitle = merged.title === 'المبتدئ' ? 'المنطلق' : merged.title;

  return {
    ...merged,
    title: normalizedTitle,
    memorizedSurahs: Array.isArray(merged.memorizedSurahs) ? merged.memorizedSurahs : [],
    completedChallenges: Array.isArray(merged.completedChallenges) ? merged.completedChallenges : [],
    unlockedAchievements: Array.isArray(merged.unlockedAchievements) ? merged.unlockedAchievements : [],
    favoriteSurahs: Array.isArray(merged.favoriteSurahs) ? merged.favoriteSurahs : [],
    readingHistory: Array.isArray(merged.readingHistory) ? merged.readingHistory.slice(0, MAX_READING_HISTORY) : [],
    activityTimeline: Array.isArray(merged.activityTimeline) ? merged.activityTimeline.slice(0, MAX_ACTIVITY_TIMELINE) : []
  };
}

function appendActivity(prev: UserProgress, activity: Omit<UserActivity, 'date'>): UserProgress {
  const nextEvent: UserActivity = {
    ...activity,
    date: new Date().toISOString()
  };

  return {
    ...prev,
    activityTimeline: [nextEvent, ...prev.activityTimeline].slice(0, MAX_ACTIVITY_TIMELINE)
  };
}

const QuranContext = createContext<QuranContextType | undefined>(undefined);

export function QuranProvider({ children }: { children: ReactNode }) {
  // User Progress State
  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    const saved = getStoredValue('quranUserProgress');
    if (!saved) {
      return defaultUserProgress;
    }

    try {
      const parsed = JSON.parse(saved) as Partial<UserProgress>;
      return normalizeUserProgress(parsed);
    } catch {
      return defaultUserProgress;
    }
  });

  // Settings State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = getStoredValue('quranDarkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [fontSize, setFontSize] = useState(() => {
    const saved = getStoredValue('quranFontSize');
    return saved ? JSON.parse(saved) : 24;
  });

  const [showTranslation, setShowTranslation] = useState(() => {
    const saved = getStoredValue('quranShowTranslation');
    return saved ? JSON.parse(saved) : true;
  });

  const [selectedReciter, setSelectedReciter] = useState(() => {
    const saved = getStoredValue('quranSelectedReciter');
    if (!saved) {
      return '7'; // Default to Yasser Al-Dosari
    }

    // Migrate old default (Mishary) to Yasser as requested.
    return saved === '3' ? '7' : saved;
  });

  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Navigation State
  const [currentSurah, setCurrentSurahState] = useState(() => {
    const saved = getStoredValue(CURRENT_SURAH_STORAGE_KEY);
    const parsed = saved ? Number.parseInt(saved, 10) : Number.NaN;
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 114 ? parsed : 1;
  });
  const [currentPage, setCurrentPageState] = useState(() => {
    const saved = getStoredValue(CURRENT_PAGE_STORAGE_KEY);
    const parsed = saved ? Number.parseInt(saved, 10) : Number.NaN;
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
  });

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<{ surah: number; verse: number; note?: string }[]>(() => {
    const saved = getStoredValue('quranBookmarks');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage on changes
  useEffect(() => {
    setStoredValue('quranUserProgress', JSON.stringify(userProgress));
  }, [userProgress]);

  useEffect(() => {
    setStoredValue('quranDarkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    setStoredValue('quranFontSize', JSON.stringify(fontSize));
  }, [fontSize]);

  useEffect(() => {
    setStoredValue('quranShowTranslation', JSON.stringify(showTranslation));
  }, [showTranslation]);

  useEffect(() => {
    setStoredValue('quranSelectedReciter', selectedReciter);
  }, [selectedReciter]);

  useEffect(() => {
    setStoredValue('quranBookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    setStoredValue(CURRENT_SURAH_STORAGE_KEY, currentSurah.toString());
  }, [currentSurah]);

  useEffect(() => {
    setStoredValue(CURRENT_PAGE_STORAGE_KEY, currentPage.toString());
  }, [currentPage]);

  // User Progress Functions
  const addPoints = (points: number) => {
    setUserProgress((prev: UserProgress) => {
      const newPoints = prev.points + points;
      const newLevel = Math.floor(newPoints / 500) + 1;
      const newTitle = titles.find(t => newPoints >= t.minPoints)?.name || prev.title;
      
      return {
        ...prev,
        points: newPoints,
        level: newLevel,
        title: newTitle
      };
    });
  };

  const completeChallenge = (challengeId: number) => {
    setUserProgress((prev: UserProgress) => {
      if (prev.completedChallenges.includes(challengeId)) return prev;
      
      const challenge = dailyChallenges.find(c => c.id === challengeId);
      if (challenge) {
        addPoints(challenge.points);
      }

      const nextProgress = {
        ...prev,
        completedChallenges: [...prev.completedChallenges, challengeId]
      };

      return appendActivity(nextProgress, { type: 'challenge', challengeId });
    });
  };

  const unlockAchievement = (achievementId: number) => {
    setUserProgress((prev: UserProgress) => {
      if (prev.unlockedAchievements.includes(achievementId)) return prev;
      
      const achievement = achievements.find(a => a.id === achievementId);
      if (achievement) {
        addPoints(achievement.points);
      }

      const nextProgress = {
        ...prev,
        unlockedAchievements: [...prev.unlockedAchievements, achievementId]
      };

      return appendActivity(nextProgress, { type: 'achievement', achievementId });
    });
  };

  const addToMemorized = (surahNumber: number) => {
    setUserProgress((prev: UserProgress) => {
      if (prev.memorizedSurahs.includes(surahNumber)) return prev;
      
      addPoints(surahs.find(s => s.number === surahNumber)?.verses || 0);

      const nextProgress = {
        ...prev,
        memorizedSurahs: [...prev.memorizedSurahs, surahNumber]
      };

      return appendActivity(nextProgress, { type: 'memorization', surah: surahNumber });
    });
  };

  const addToFavorites = (surahNumber: number) => {
    setUserProgress((prev: UserProgress) => {
      if (prev.favoriteSurahs.includes(surahNumber)) return prev;
      const nextProgress = {
        ...prev,
        favoriteSurahs: [...prev.favoriteSurahs, surahNumber]
      };
      return appendActivity(nextProgress, { type: 'favorite', surah: surahNumber });
    });
  };

  const removeFromFavorites = (surahNumber: number) => {
    setUserProgress((prev: UserProgress) => ({
      ...prev,
      favoriteSurahs: prev.favoriteSurahs.filter(s => s !== surahNumber)
    }));
  };

  const updateStreak = () => {
    setUserProgress((prev: UserProgress) => {
      const today = new Date().toISOString().split('T')[0];
      const lastRead = prev.lastRead;
      
      if (lastRead === today) return prev;
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const newStreak = lastRead === yesterdayStr ? prev.streak + 1 : 1;
      
      // Bonus points for streaks
      if (newStreak % 7 === 0) {
        addPoints(50); // Weekly streak bonus
      }
      
      return {
        ...prev,
        streak: newStreak,
        lastRead: today
      };
    });
  };

  const addReadingHistory = (surah: number, verses: number) => {
    setUserProgress((prev: UserProgress) => {
      const nextProgress = {
        ...prev,
        totalRead: prev.totalRead + verses,
        readingHistory: [
          { date: new Date().toISOString(), surah, verses },
          ...prev.readingHistory.slice(0, MAX_READING_HISTORY - 1)
        ]
      };

      return appendActivity(nextProgress, { type: 'reading', surah, verses });
    });
    updateStreak();
  };

  // Settings Functions
  const toggleDarkMode = () => setDarkMode((prev: boolean) => !prev);
  const toggleTranslation = () => setShowTranslation((prev: boolean) => !prev);
  const setCurrentSurah = (surah: number) => {
    const safeSurah = Math.min(114, Math.max(1, Math.trunc(surah)));
    setCurrentSurahState(safeSurah);
  };
  const setCurrentPage = (page: number) => {
    const safePage = Math.max(1, Math.trunc(page));
    setCurrentPageState(safePage);
  };

  // Audio Functions
  const playAudio = (url: string) => {
    // Resume the same recitation track from the paused position.
    if (audioElement && currentAudio === url) {
      const resumePromise = audioElement.play();
      if (resumePromise instanceof Promise) {
        resumePromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(true);
      }
      return;
    }

    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    
    const newAudio = new Audio(url);
    newAudio.onplay = () => setIsPlaying(true);
    newAudio.onpause = () => setIsPlaying(false);
    setAudioElement(newAudio);
    setCurrentAudio(url);
    
    newAudio.onended = () => {
      setIsPlaying(false);
      setCurrentAudio(null);
    };

    const playPromise = newAudio.play();
    if (playPromise instanceof Promise) {
      playPromise.catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const pauseAudio = () => {
    if (audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  };

  // Bookmark Functions
  const addBookmark = (surah: number, verse: number, note?: string) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.surah === surah && b.verse === verse);
      if (exists) return prev;

      setUserProgress((previousProgress) =>
        appendActivity(previousProgress, { type: 'bookmark', surah, verse })
      );

      return [...prev, { surah, verse, note }];
    });
  };

  const removeBookmark = (surah: number, verse: number) => {
    setBookmarks(prev => prev.filter(b => !(b.surah === surah && b.verse === verse)));
  };

  const value: QuranContextType = {
    userProgress,
    addPoints,
    completeChallenge,
    unlockAchievement,
    addToMemorized,
    addToFavorites,
    removeFromFavorites,
    updateStreak,
    addReadingHistory,
    darkMode,
    toggleDarkMode,
    fontSize,
    setFontSize,
    showTranslation,
    toggleTranslation,
    selectedReciter,
    setSelectedReciter,
    isPlaying,
    currentAudio,
    playAudio,
    pauseAudio,
    stopAudio,
    currentSurah,
    setCurrentSurah,
    currentPage,
    setCurrentPage,
    bookmarks,
    addBookmark,
    removeBookmark
  };

  return (
    <QuranContext.Provider value={value}>
      {children}
    </QuranContext.Provider>
  );
}

export function useQuran() {
  const context = useContext(QuranContext);
  if (context === undefined) {
    throw new Error('useQuran must be used within a QuranProvider');
  }
  return context;
}

