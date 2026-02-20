import { useState, useEffect, useMemo } from 'react';
import { useQuran } from '@/context/QuranContext';
import { surahs, versesData } from '@/data/quran';
import { memorizationPlans, reviewPatterns, memorizationTips, postMemorizationDuas } from '@/data/memorization';
import { 
  Play, 
  Pause, 
  BookOpen, 
  Check,
  ChevronLeft,
  ChevronRight,
  Target,
  Trophy,
  Repeat,
  Lightbulb,
  Heart,
  TrendingUp,
  Search,
  RotateCcw,
  ListChecks,
  Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import AppLogo from '@/components/app-logo';
import PageInfoPanel from '@/components/page-info-panel';
import { getStoredValue, removeStoredValue, setStoredValue } from '@/lib/user-storage';

const MEMORIZE_STORAGE_KEYS = {
  surah: 'quranMemorizeSelectedSurah',
  verse: 'quranMemorizeCurrentVerse',
  progressBySurah: 'quranMemorizeProgressBySurah',
  plan: 'quranMemorizeSelectedPlan',
  repeatCount: 'quranMemorizeRepeatCount',
  testQuestions: 'quranMemorizeTestQuestions'
} as const;

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

interface TestQuestion {
  verseNumber: number;
  wordsWithBlank: string[];
  correctAnswer: string;
  options: string[];
}

function normalizeSearchText(value: string): string {
  return value
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .toLowerCase()
    .trim();
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }
  return copy;
}

function loadStoredNumber(key: string, fallback: number, minValue: number, maxValue?: number): number {
  const raw = getStoredValue(key);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  const bounded = Math.max(minValue, parsed);
  if (typeof maxValue === 'number') {
    return Math.min(maxValue, bounded);
  }
  return bounded;
}

function loadStoredProgressBySurah(): Record<number, number[]> {
  try {
    const raw = getStoredValue(MEMORIZE_STORAGE_KEYS.progressBySurah);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const sanitized: Record<number, number[]> = {};

    Object.entries(parsed).forEach(([surahKey, versesList]) => {
      const surahNumber = Number.parseInt(surahKey, 10);
      if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114 || !Array.isArray(versesList)) {
        return;
      }

      const validVerses = Array.from(
        new Set(
          versesList
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
            .map((value) => Math.max(1, Math.trunc(value)))
        )
      ).sort((a, b) => a - b);

      sanitized[surahNumber] = validVerses;
    });

    return sanitized;
  } catch {
    return {};
  }
}

function buildSurahAudioUrl(surahNumber: number, reciterId: string): string {
  const reciterBase = RECITER_SURAH_AUDIO_BASE[reciterId] || RECITER_SURAH_AUDIO_BASE['7'];
  const surahPart = surahNumber.toString().padStart(3, '0');
  return `${reciterBase}${surahPart}.mp3`;
}

// مكون وضع التكرار للحفظ
function LoopMode({ 
  verse, 
  repeatCount, 
  onComplete 
}: { 
  verse: { text: string; number: number }; 
  repeatCount: number;
  onComplete: () => void;
}) {
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isPlaying && currentRepeat < repeatCount) {
      const timer = setTimeout(() => {
        setCurrentRepeat(prev => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    } else if (currentRepeat >= repeatCount) {
      onComplete();
    }
  }, [isPlaying, currentRepeat, repeatCount, onComplete]);

  return (
    <div className="text-center p-8">
      <div className="mb-6">
        <div className="text-6xl mb-4">🔁</div>
        <h3 className="text-xl font-bold mb-2">وضع التكرار</h3>
        <p className="text-slate-500">التكرار {currentRepeat} من {repeatCount}</p>
      </div>
      
      <div className="text-3xl font-arabic mb-8 leading-loose">
        {verse.text}
      </div>
      
      <div className="flex justify-center gap-4">
        <Button 
          size="lg" 
          onClick={() => setIsPlaying(!isPlaying)}
          className="bg-emerald-600"
        >
          {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
          {isPlaying ? 'إيقاف' : 'بدء التكرار'}
        </Button>
      </div>
      
      <div className="mt-6 flex justify-center gap-1">
        {Array.from({ length: repeatCount }, (_, i) => (
          <div 
            key={i}
            className={`w-3 h-3 rounded-full ${i < currentRepeat ? 'bg-emerald-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>
    </div>
  );
}

// مكون اختبار الحفظ
function MemorizationTest({ 
  verses, 
  onComplete 
}: { 
  verses: { number: number; text: string }[];
  onComplete: (score: number) => void;
}) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const questions = useMemo<TestQuestion[]>(() => {
    return verses.map((verse) => {
      const words = verse.text.split(' ').filter(Boolean);
      const blankIndex = Math.min(
        Math.floor(Math.random() * Math.max(1, words.length)),
        Math.max(0, words.length - 1)
      );
      const correctAnswer = words[blankIndex] || '';

      const wrongPool = verses
        .filter((item) => item.number !== verse.number)
        .flatMap((item) => item.text.split(' ').filter(Boolean))
        .filter((word) => word !== correctAnswer);
      const wrongAnswers = shuffleArray(Array.from(new Set(wrongPool))).slice(0, 3);
      const fallbackWords = ['اللَّهُ', 'الْحَمْدُ', 'الرَّحِيمِ', 'الْعَالَمِينَ'];
      const options = shuffleArray([correctAnswer, ...wrongAnswers, ...fallbackWords]).slice(0, 4);

      const wordsWithBlank = [...words];
      wordsWithBlank[blankIndex] = '_____';

      return {
        verseNumber: verse.number,
        wordsWithBlank,
        correctAnswer,
        options
      };
    });
  }, [verses]);

  useEffect(() => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setSelectedAnswer(null);
  }, [verses]);

  if (questions.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-slate-500">لا توجد آيات كافية لبدء الاختبار.</p>
      </div>
    );
  }

  const question = questions[currentQuestion];

  const handleAnswer = (answer: string, index: number) => {
    if (selectedAnswer !== null) {
      return;
    }

    setSelectedAnswer(index);
    const isCorrect = answer === question.correctAnswer;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        const finalScore = score + (isCorrect ? 1 : 0);
        setScore(finalScore);
        setShowResult(true);
      }
    }, 700);
  };

  if (showResult) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold mb-4">اكتمل الاختبار!</h3>
        <div className="text-5xl font-bold text-emerald-600 mb-4">
          {Math.round((score / questions.length) * 100)}%
        </div>
        <p className="text-slate-500 mb-6">
          أجبت بشكل صحيح على {score} من {questions.length} أسئلة
        </p>
        <Button onClick={() => onComplete(Math.round((score / questions.length) * 100))} className="bg-emerald-600">
          العودة للحفظ
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between text-sm text-slate-500 mb-2">
          <span>السؤال {currentQuestion + 1} من {questions.length}</span>
          <span>النقاط: {score}</span>
        </div>
        <Progress value={(currentQuestion / questions.length) * 100} className="h-2" />
      </div>

      <div className="text-center mb-8">
        <p className="text-2xl font-arabic leading-loose mb-4">
          {question.wordsWithBlank.join(' ')}
        </p>
        <p className="text-slate-500">اكمل الآية باختيار الكلمة الصحيحة</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((option, index) => (
          <Button
            key={index}
            variant={selectedAnswer === index 
              ? option === question.correctAnswer ? 'default' : 'destructive'
              : 'outline'
            }
            className="h-auto py-4 text-lg font-arabic"
            onClick={() => handleAnswer(option, index)}
            disabled={selectedAnswer !== null}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function Memorize() {
  const { 
    darkMode, 
    userProgress, 
    addPoints, 
    addToMemorized,
    playAudio,
    isPlaying,
    pauseAudio,
    selectedReciter
  } = useQuran();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(() => getStoredValue(MEMORIZE_STORAGE_KEYS.plan));
  const [selectedSurah, setSelectedSurah] = useState(() => loadStoredNumber(MEMORIZE_STORAGE_KEYS.surah, 1, 1, 114));
  const [currentVerse, setCurrentVerse] = useState(() => loadStoredNumber(MEMORIZE_STORAGE_KEYS.verse, 1, 1));
  const [showLoopMode, setShowLoopMode] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [repeatCount, setRepeatCount] = useState(() => loadStoredNumber(MEMORIZE_STORAGE_KEYS.repeatCount, 5, 2, 20));
  const [testQuestionCount, setTestQuestionCount] = useState(() => loadStoredNumber(MEMORIZE_STORAGE_KEYS.testQuestions, 5, 3, 15));
  const [surahSearchQuery, setSurahSearchQuery] = useState('');
  const [memorizedBySurah, setMemorizedBySurah] = useState<Record<number, number[]>>(() => loadStoredProgressBySurah());
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedSurahName, setCompletedSurahName] = useState('');
  const selectedPlanData = memorizationPlans.find((plan) => plan.id === selectedPlan) || null;

  const surah = surahs.find(s => s.number === selectedSurah);
  const verses = versesData[selectedSurah] || [];

  // Generate verses if not available
  const displayVerses = verses.length > 0 ? verses : Array.from({ length: surah?.verses || 7 }, (_, i) => ({
    number: i + 1,
    text: `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ - آية ${i + 1} من سورة ${surah?.name}`,
    translation: '',
    juz: surah?.juz[0] || 1,
    page: 1
  }));

  const memorizedVerses = useMemo(() => {
    return (memorizedBySurah[selectedSurah] || [])
      .filter((value) => value >= 1 && value <= displayVerses.length)
      .sort((a, b) => a - b);
  }, [memorizedBySurah, selectedSurah, displayVerses.length]);
  const memorizedSet = useMemo(() => new Set(memorizedVerses), [memorizedVerses]);
  const currentVerseData = displayVerses[Math.max(0, currentVerse - 1)];
  const remainingVerses = Math.max(0, displayVerses.length - memorizedVerses.length);
  const progressPercent = displayVerses.length === 0 ? 0 : (memorizedVerses.length / displayVerses.length) * 100;
  const nextUnmemorizedVerse = displayVerses.find((verse) => !memorizedSet.has(verse.number))?.number || 1;
  const dailyTarget = selectedPlanData?.dailyAmount || 5;
  const memorizeInfoStats = [
    { label: 'السورة الحالية', value: surah?.name || '-' },
    { label: 'نسبة الحفظ', value: `${Math.round(progressPercent)}%` },
    { label: 'محفوظ', value: `${memorizedVerses.length}/${displayVerses.length}` },
    { label: 'الهدف اليومي', value: `${dailyTarget} آية` }
  ];
  const estimatedDays = dailyTarget > 0 ? Math.ceil(remainingVerses / dailyTarget) : null;

  const filteredSurahs = useMemo(() => {
    const query = normalizeSearchText(surahSearchQuery);
    if (!query) {
      return surahs;
    }

    return surahs.filter((item) => {
      const candidates = [
        item.name,
        item.englishName,
        `سورة ${item.name}`,
        item.number.toString()
      ].map((value) => normalizeSearchText(value));
      return candidates.some((value) => value.includes(query));
    });
  }, [surahSearchQuery]);

  const testVerses = useMemo(() => {
    const startIndex = Math.max(0, currentVerse - 1);
    const sliced = displayVerses.slice(startIndex, startIndex + testQuestionCount);
    if (sliced.length >= 3) {
      return sliced;
    }
    return displayVerses.slice(0, Math.max(3, Math.min(testQuestionCount, displayVerses.length)));
  }, [displayVerses, currentVerse, testQuestionCount]);

  useEffect(() => {
    setStoredValue(MEMORIZE_STORAGE_KEYS.surah, selectedSurah.toString());
  }, [selectedSurah]);

  useEffect(() => {
    setStoredValue(MEMORIZE_STORAGE_KEYS.verse, currentVerse.toString());
  }, [currentVerse]);

  useEffect(() => {
    setStoredValue(MEMORIZE_STORAGE_KEYS.repeatCount, repeatCount.toString());
  }, [repeatCount]);

  useEffect(() => {
    setStoredValue(MEMORIZE_STORAGE_KEYS.testQuestions, testQuestionCount.toString());
  }, [testQuestionCount]);

  useEffect(() => {
    setStoredValue(MEMORIZE_STORAGE_KEYS.progressBySurah, JSON.stringify(memorizedBySurah));
  }, [memorizedBySurah]);

  useEffect(() => {
    if (selectedPlan) {
      setStoredValue(MEMORIZE_STORAGE_KEYS.plan, selectedPlan);
    } else {
      removeStoredValue(MEMORIZE_STORAGE_KEYS.plan);
    }
  }, [selectedPlan]);

  useEffect(() => {
    if (currentVerse > displayVerses.length) {
      setCurrentVerse(1);
    }
  }, [currentVerse, displayVerses.length]);

  const setVerseMemorizedState = (verseNumber: number, shouldMark: boolean) => {
    setMemorizedBySurah((prev) => {
      const existing = new Set(prev[selectedSurah] || []);
      const alreadyMarked = existing.has(verseNumber);

      if (shouldMark) {
        existing.add(verseNumber);
      } else {
        existing.delete(verseNumber);
      }

      const nextVerses = Array.from(existing)
        .filter((value) => value >= 1 && value <= displayVerses.length)
        .sort((a, b) => a - b);
      const next = { ...prev, [selectedSurah]: nextVerses };

      if (shouldMark && !alreadyMarked) {
        addPoints(10);
      }

      if (shouldMark && !alreadyMarked && nextVerses.length === displayVerses.length) {
        setCompletedSurahName(surah?.name || '');
        setShowCelebration(true);
        addToMemorized(selectedSurah);
        addPoints(100);
      }

      return next;
    });
  };

  const handleVerseMemorized = () => {
    setVerseMemorizedState(currentVerse, !memorizedSet.has(currentVerse));
  };

  const playCurrentSurahAudio = () => {
    playAudio(buildSurahAudioUrl(selectedSurah, selectedReciter));
  };

  return (
    <div className={`app-page-shell spiritual-page-bg transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-[55] border-b backdrop-blur-xl shadow-sm ${darkMode ? 'bg-slate-900/78 border-slate-700' : 'bg-white/78 border-emerald-100'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AppLogo size="md" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl" />
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  وضع التحفيظ
                </h1>
                <p className={`text-[11px] sm:text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  خطة حفظ يومية مع تكرار واختبار
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500 text-white">
                <Trophy className="w-4 h-4 mr-1" />
                {memorizedVerses.length} / {displayVerses.length}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="app-page-main max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <PageInfoPanel
          darkMode={darkMode}
          accent="emerald"
          className="mb-6"
          title="دليل صفحة التحفيظ"
          description="اختر السورة والخطة المناسبة، ثم كرر الآيات واختبر نفسك مع متابعة واضحة للتقدم."
          tips={[
            'ابدأ دائمًا من الآية المتبقية التالية لتثبيت التسلسل.',
            'استخدم وضع التكرار قبل الاختبار لرفع نسبة الإتقان.',
            'علّم الآية بعد التأكد من حفظها للحفاظ على دقة التقدم.'
          ]}
          stats={memorizeInfoStats}
        />

        {/* Progress Bar */}
        <Card className={`mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">تقدم الحفظ</span>
              <span className="text-emerald-600 font-bold">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className={`rounded-lg p-2 ${darkMode ? 'bg-slate-700' : 'bg-emerald-50'}`}>
                <p className="text-lg font-bold text-emerald-600">{memorizedVerses.length}</p>
                <p className="text-[11px]">محفوظ</p>
              </div>
              <div className={`rounded-lg p-2 ${darkMode ? 'bg-slate-700' : 'bg-amber-50'}`}>
                <p className="text-lg font-bold text-amber-600">{remainingVerses}</p>
                <p className="text-[11px]">متبقي</p>
              </div>
              <div className={`rounded-lg p-2 ${darkMode ? 'bg-slate-700' : 'bg-blue-50'}`}>
                <p className="text-lg font-bold text-blue-600">{userProgress.streak}</p>
                <p className="text-[11px]">استمرارية</p>
              </div>
            </div>
            {estimatedDays !== null && (
              <p className={`text-xs mt-3 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                حسب الخطة الحالية ({dailyTarget} آية/يوم): متوقع الإنهاء خلال {estimatedDays} يوم تقريبًا.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Memorization Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Surah Selector */}
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold">ابحث عن السورة</p>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          value={surahSearchQuery}
                          onChange={(event) => setSurahSearchQuery(event.target.value)}
                          placeholder="اسم السورة أو رقمها"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold">اختر السورة</p>
                      <select
                        value={selectedSurah}
                        onChange={(e) => {
                          setSelectedSurah(Number(e.target.value));
                          setCurrentVerse(1);
                          setShowLoopMode(false);
                          setShowTest(false);
                        }}
                        className={`w-full p-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-emerald-200'}`}
                      >
                        {(filteredSurahs.length > 0 ? filteredSurahs : surahs.filter((item) => item.number === selectedSurah)).map((s) => (
                          <option key={s.number} value={s.number}>
                            {s.number}. {s.name} ({s.verses} آية)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[3, 5, 7, 10].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRepeatCount(value)}
                        className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                          repeatCount === value
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                            : darkMode
                              ? 'border-slate-700 bg-slate-900/40 text-slate-300 hover:bg-slate-800'
                              : 'border-emerald-100 bg-white text-slate-700 hover:bg-emerald-50'
                        }`}
                      >
                        تكرار {value}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[3, 5, 8, 10].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTestQuestionCount(value)}
                        className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                          testQuestionCount === value
                            ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300'
                            : darkMode
                              ? 'border-slate-700 bg-slate-900/40 text-slate-300 hover:bg-slate-800'
                              : 'border-sky-100 bg-white text-slate-700 hover:bg-sky-50'
                        }`}
                      >
                        اختبار {value}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowTest(false);
                        setShowLoopMode(true);
                      }}
                    >
                      <Repeat className="w-4 h-4 ml-1" />
                      تكرار
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowLoopMode(false);
                        setShowTest(true);
                      }}
                    >
                      <Target className="w-4 h-4 ml-1" />
                      اختبار
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentVerse(nextUnmemorizedVerse);
                        setShowLoopMode(false);
                        setShowTest(false);
                      }}
                    >
                      <ListChecks className="w-4 h-4 ml-1" />
                      متبقي
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMemorizedBySurah((prev) => {
                          const next = { ...prev };
                          delete next[selectedSurah];
                          return next;
                        });
                        setCurrentVerse(1);
                        setShowLoopMode(false);
                        setShowTest(false);
                      }}
                    >
                      <RotateCcw className="w-4 h-4 ml-1" />
                      تصفير
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verse Display */}
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-500" />
                    سورة {surah?.name} - آية {currentVerse}
                  </CardTitle>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Badge variant="outline">الجزء {surah?.juz[0]}</Badge>
                    <Badge variant="secondary">{surah?.type}</Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                {showLoopMode ? (
                  <LoopMode 
                    verse={currentVerseData} 
                    repeatCount={repeatCount}
                    onComplete={() => setShowLoopMode(false)}
                  />
                ) : showTest ? (
                  <MemorizationTest 
                    verses={testVerses}
                    onComplete={(score) => {
                      addPoints(Math.max(10, Math.floor(score / 2)));
                      setShowTest(false);
                    }}
                  />
                ) : (
                  <>
                    {/* Verse Text */}
                    <div className="text-center mb-8">
                      <p className="text-2xl sm:text-4xl font-arabic leading-loose mb-6">
                        {currentVerseData?.text}
                      </p>
                      <Badge className="text-lg px-4 py-2">
                        الآية {currentVerse}
                      </Badge>
                    </div>

                    {/* Audio Controls */}
                    <div className="flex justify-center gap-4 mb-6">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => isPlaying ? pauseAudio() : playCurrentSurahAudio()}
                      >
                        {isPlaying ? <Pause className="w-5 h-5 ml-1" /> : <Play className="w-5 h-5 ml-1" />}
                        <Volume2 className="w-5 h-5" />
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setCurrentVerse(prev => Math.max(1, prev - 1))}
                        disabled={currentVerse === 1}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setCurrentVerse(prev => Math.min(displayVerses.length, prev + 1))}
                        disabled={currentVerse === displayVerses.length}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                    </div>

                    {/* Mark as Memorized */}
                    <div className="flex justify-center">
                      <Button
                        size="lg"
                        onClick={handleVerseMemorized}
                        className={memorizedSet.has(currentVerse) ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-emerald-600'}
                      >
                        {memorizedSet.has(currentVerse) ? (
                          <><Check className="w-5 h-5 mr-2" /> إلغاء علامة الحفظ</>
                        ) : (
                          <><Check className="w-5 h-5 mr-2" /> علمتها</>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-emerald-500" />
                  متابعة آيات السورة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="flex flex-wrap gap-2">
                    {displayVerses.map((verse) => {
                      const isMemorized = memorizedSet.has(verse.number);
                      const isCurrent = verse.number === currentVerse;

                      return (
                        <button
                          key={verse.number}
                          type="button"
                          onClick={() => {
                            setCurrentVerse(verse.number);
                            setShowLoopMode(false);
                            setShowTest(false);
                          }}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            isCurrent
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                              : isMemorized
                                ? darkMode
                                  ? 'border-emerald-700 bg-emerald-900/20 text-emerald-300'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : darkMode
                                  ? 'border-slate-700 bg-slate-900/40 text-slate-300'
                                  : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          آية {verse.number}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  نصائح للحفظ السريع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {memorizationTips.map(tip => (
                    <div key={tip.id} className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>
                      <span className="text-2xl">{tip.icon}</span>
                      <div>
                        <p className="font-semibold">{tip.title}</p>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {tip.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Memorization Plans */}
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-500" />
                  خطط التحفيظ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {memorizationPlans.map(plan => (
                      <div
                        key={plan.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                          selectedPlan === plan.id 
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                            : darkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-100 hover:border-emerald-200'
                        }`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{plan.icon}</span>
                          <div className="flex-1">
                            <p className="font-semibold">{plan.name}</p>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {plan.dailyAmount} آية/يوم
                            </p>
                            <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                              {plan.durationDays ? `${plan.durationDays} يوم` : 'خطة مرنة'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {selectedPlanData && (
              <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'}`}>
                <CardContent className="p-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    تفاصيل الخطة
                  </h3>
                  <p className="text-sm font-semibold">{selectedPlanData.name}</p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {selectedPlanData.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className={`rounded-lg p-2 ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>
                      <p className="text-[11px]">الهدف اليومي</p>
                      <p className="font-bold">{dailyTarget} آية</p>
                    </div>
                    <div className={`rounded-lg p-2 ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>
                      <p className="text-[11px]">متبقي تقريبًا</p>
                      <p className="font-bold">{estimatedDays ?? '--'} يوم</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Review Patterns */}
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-blue-500" />
                  أنماط المراجعة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reviewPatterns.map(pattern => (
                    <div key={pattern.id} className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-blue-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span>{pattern.icon}</span>
                        <span className="font-semibold">{pattern.name}</span>
                      </div>
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {pattern.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Today's Progress */}
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'}`}>
              <CardContent className="p-4">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  تقدمك اليوم
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>
                    <p className="text-2xl font-bold text-emerald-600">{memorizedVerses.length}</p>
                    <p className="text-sm">آية محفوظة</p>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>
                    <p className="text-2xl font-bold text-blue-600">{userProgress.streak}</p>
                    <p className="text-sm">يوم متتالي</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dua After Memorization */}
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'}`}>
              <CardContent className="p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  دعاء بعد الحفظ
                </h3>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {postMemorizationDuas.map((dua) => (
                      <div key={dua.text} className={`rounded-lg p-2.5 ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>
                        <p className="text-sm font-arabic leading-relaxed text-center">
                          {dua.text}
                        </p>
                        <p className={`text-[11px] mt-1 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {dua.source}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Celebration Dialog */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-3xl">
              <span className="text-6xl block mb-4">🎉</span>
              مبروك!
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-xl mb-4">
              لقد أكملت حفظ سورة {completedSurahName || surah?.name}!
            </p>
            <div className="flex justify-center gap-4">
              <Badge className="text-lg px-4 py-2 bg-amber-500">
                <Trophy className="w-5 h-5 mr-2" />
                +100 نقطة
              </Badge>
            </div>
            <p className="mt-4 text-slate-500">
              {postMemorizationDuas[1].text}
            </p>
          </div>
          <Button onClick={() => setShowCelebration(false)} className="w-full bg-emerald-600">
            استمرار
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
