import { useState } from 'react';
import { useQuran } from '@/context/QuranContext';
import { 
  Star, 
  Trophy, 
  Heart, 
  Sparkles,
  Check,
  RotateCcw,
  PartyPopper,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLogo from '@/components/app-logo';
import PageInfoPanel from '@/components/page-info-panel';

type KidsGame = 'matching' | 'ordering' | 'completion' | 'memorization';

interface OrderedSurahItem {
  id: number;
  name: string;
  order: number;
}

const ORDERING_ITEMS: OrderedSurahItem[] = [
  { id: 1, name: 'الفاتحة', order: 1 },
  { id: 2, name: 'البقرة', order: 2 },
  { id: 3, name: 'آل عمران', order: 3 },
  { id: 4, name: 'النساء', order: 4 }
];

function seededShuffle<T>(items: T[], seed: number): T[] {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }

  const nextRandom = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };

  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(nextRandom() * (i + 1));
    [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
  }

  return result;
}

// Matching Game Component
function MatchingGame({ onComplete, onScore }: { onComplete: () => void, onScore: (score: number) => void }) {
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  
  const pairs = [
    { verse: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', surah: 1, surahName: 'الفاتحة' },
    { verse: 'قُلْ هُوَ اللَّهُ أَحَدٌ', surah: 112, surahName: 'الإخلاص' },
    { verse: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', surah: 113, surahName: 'الفلق' },
    { verse: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', surah: 114, surahName: 'الناس' },
  ];

  const handleVerseClick = (index: number) => {
    if (selectedVerse === null) {
      setSelectedVerse(index);
    }
  };

  const handleSurahClick = (surahNum: number) => {
    if (selectedVerse !== null) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      
      if (pairs[selectedVerse].surah === surahNum) {
        setMatched(prev => [...prev, selectedVerse]);
        setSelectedVerse(null);
        
        if (matched.length + 1 === pairs.length) {
          const score = Math.max(100 - nextAttempts * 10, 20);
          onScore(score);
          setTimeout(onComplete, 1000);
        }
      } else {
        setTimeout(() => {
          setSelectedVerse(null);
        }, 1000);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-lg mb-4">وصل الآية بسورتها الصحيحة!</p>
        <div className={`h-2 rounded-full ${matched.length === pairs.length ? 'bg-emerald-500' : 'bg-slate-200'}`}>
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${(matched.length / pairs.length) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-3">
          <h3 className="font-bold text-center">الآيات</h3>
          {pairs.map((pair, index) => (
            <Button
              key={index}
              variant={matched.includes(index) ? 'default' : selectedVerse === index ? 'default' : 'outline'}
              className={`w-full h-auto py-3 sm:py-4 text-right ${
                matched.includes(index) ? 'bg-emerald-500' : ''
              }`}
              onClick={() => handleVerseClick(index)}
              disabled={matched.includes(index) || selectedVerse !== null}
            >
              <p className="font-arabic text-base sm:text-lg">{pair.verse}</p>
            </Button>
          ))}
        </div>
        
        <div className="space-y-3">
          <h3 className="font-bold text-center">السور</h3>
          {pairs.map((pair, index) => (
            <Button
              key={index}
              variant={matched.includes(index) ? 'default' : 'outline'}
              className={`w-full ${matched.includes(index) ? 'bg-emerald-500' : ''}`}
              onClick={() => handleSurahClick(pair.surah)}
              disabled={matched.includes(index)}
            >
              {pair.surahName}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Ordering Game Component
function OrderingGame({
  onComplete,
  onScore,
  shuffleSeed
}: {
  onComplete: () => void;
  onScore: (score: number) => void;
  shuffleSeed: number;
}) {
  const [items, setItems] = useState<OrderedSurahItem[]>(() => seededShuffle(ORDERING_ITEMS, shuffleSeed));
  
  const [selected, setSelected] = useState<number | null>(null);

  const handleSwap = (index: number) => {
    if (selected === null) {
      setSelected(index);
    } else if (selected !== index) {
      const newItems = [...items];
      [newItems[selected], newItems[index]] = [newItems[index], newItems[selected]];
      setItems(newItems);
      setSelected(null);
      
      // Check if correct
      const isCorrect = newItems.every((item, i) => item.order === i + 1);
      if (isCorrect) {
        onScore(100);
        setTimeout(onComplete, 1000);
      }
    } else {
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-lg text-center">رتب السور حسب ترتيبها في المصحف!</p>
      
      <div className="space-y-3">
        {items.map((item, index) => (
          <Button
            key={item.id}
            variant={selected === index ? 'default' : 'outline'}
            className={`w-full py-6 text-lg ${
              item.order === index + 1 ? 'border-emerald-500 border-2' : ''
            }`}
            onClick={() => handleSwap(index)}
          >
            <span className="mr-4">{index + 1}.</span>
            {item.name}
            {item.order === index + 1 && <Check className="w-5 h-5 mr-auto text-emerald-500" />}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Completion Game Component
function CompletionGame({ onComplete, onScore }: { onComplete: () => void, onScore: (score: number) => void }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  
  const questions = [
    {
      verse: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      options: ['الفاتحة', 'البقرة', 'الإخلاص', 'الفلق'],
      correct: 0
    },
    {
      verse: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
      options: ['الفاتحة', 'الإخلاص', 'الفلق', 'الناس'],
      correct: 1
    },
    {
      verse: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
      options: ['البقرة', 'الفاتحة', 'آل عمران', 'النساء'],
      correct: 1
    },
    {
      verse: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      options: ['البقرة', 'الإخلاص', 'الفاتحة', 'الفلق'],
      correct: 2
    },
    {
      verse: 'لَمْ يَلِدْ وَلَمْ يُولَدْ',
      options: ['الإخلاص', 'الناس', 'الكوثر', 'العصر'],
      correct: 0
    },
    {
      verse: 'مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ',
      options: ['الماعون', 'الناس', 'الفجر', 'الكافرون'],
      correct: 1
    },
    {
      verse: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ',
      options: ['الفلق', 'الكوثر', 'المسد', 'الضحى'],
      correct: 0
    },
    {
      verse: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ',
      options: ['الضحى', 'الكوثر', 'العصر', 'الناس'],
      correct: 1
    },
    {
      verse: 'أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ',
      options: ['الماعون', 'التكاثر', 'قريش', 'الناس'],
      correct: 0
    },
    {
      verse: 'قُلْ يَا أَيُّهَا الْكَافِرُونَ',
      options: ['المسد', 'الكافرون', 'الفيل', 'الكوثر'],
      correct: 1
    },
    {
      verse: 'وَالْعَصْرِ',
      options: ['العصر', 'التين', 'القدر', 'المطففين'],
      correct: 0
    },
    {
      verse: 'تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ',
      options: ['الكوثر', 'المسد', 'الكافرون', 'الفلق'],
      correct: 1
    }
  ];

  const handleAnswer = (index: number) => {
    const isCorrectAnswer = index === questions[currentQ].correct;
    const nextScore = isCorrectAnswer ? score + 1 : score;
    if (isCorrectAnswer) {
      setScore(nextScore);
    }
    
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
    } else {
      const finalScore = Math.round((nextScore / questions.length) * 100);
      onScore(finalScore);
      setTimeout(onComplete, 1000);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`h-2 rounded-full bg-slate-200`}>
        <div 
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
        />
      </div>
      
      <div className="text-center">
        <p className="text-sm text-slate-500 mb-2">السؤال {currentQ + 1} من {questions.length}</p>
        <p className="text-xl sm:text-2xl font-arabic mb-6">{questions[currentQ].verse}</p>
        <p className="text-lg mb-4">ما هي السورة؟</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {questions[currentQ].options.map((option, index) => (
          <Button
            key={index}
            variant="outline"
            className="h-auto py-4 text-lg"
            onClick={() => handleAnswer(index)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}

function MemorizationGame({ onComplete, onScore }: { onComplete: () => void, onScore: (score: number) => void }) {
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);

  const challenges = [
    {
      prompt: 'أكمل الآية: قُلْ هُوَ اللَّهُ أَحَدٌ',
      options: ['اللَّهُ الصَّمَدُ', 'مَالِكِ يَوْمِ الدِّينِ', 'اهْدِنَا الصِّرَاطَ', 'وَمِنْ شَرِّ النَّفَّاثَاتِ'],
      correct: 0
    },
    {
      prompt: 'أكمل الآية: اللَّهُ الصَّمَدُ',
      options: ['اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', 'لَمْ يَلِدْ وَلَمْ يُولَدْ', 'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ'],
      correct: 2
    },
    {
      prompt: 'أكمل الآية: لَمْ يَلِدْ وَلَمْ يُولَدْ',
      options: ['إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', 'مَالِكِ يَوْمِ الدِّينِ', 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ'],
      correct: 1
    },
    {
      prompt: 'أكمل الآية: قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ',
      options: ['مِنْ شَرِّ مَا خَلَقَ', 'اللَّهُ الصَّمَدُ', 'إِيَّاكَ نَعْبُدُ', 'مِنَ الْجِنَّةِ وَالنَّاسِ'],
      correct: 0
    },
    {
      prompt: 'أكمل الآية: مِنْ شَرِّ مَا خَلَقَ',
      options: ['وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ', 'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', 'مَالِكِ يَوْمِ الدِّينِ', 'وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ'],
      correct: 3
    },
    {
      prompt: 'أكمل الآية: وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ',
      options: ['إِلَٰهِ النَّاسِ', 'وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ', 'إِيَّاكَ نَسْتَعِينُ', 'تَبَّتْ يَدَا أَبِي لَهَبٍ'],
      correct: 1
    },
    {
      prompt: 'أكمل الآية: الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
      options: ['اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', 'قُلْ هُوَ اللَّهُ أَحَدٌ', 'الرَّحْمَٰنِ الرَّحِيمِ', 'اللَّهُ الصَّمَدُ'],
      correct: 2
    },
    {
      prompt: 'أكمل الآية: الرَّحْمَٰنِ الرَّحِيمِ',
      options: ['مَالِكِ يَوْمِ الدِّينِ', 'قُلْ هُوَ اللَّهُ أَحَدٌ', 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', 'إِنَّا أَعْطَيْنَاكَ'],
      correct: 0
    },
    {
      prompt: 'أكمل الآية: مَالِكِ يَوْمِ الدِّينِ',
      options: ['إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', 'اللَّهُ الصَّمَدُ', 'مِنْ شَرِّ غَاسِقٍ', 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ'],
      correct: 0
    },
    {
      prompt: 'أكمل الآية: إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      options: ['الرَّحْمَٰنِ الرَّحِيمِ', 'قُلْ يَا أَيُّهَا الْكَافِرُونَ', 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', 'اللَّهُ الصَّمَدُ'],
      correct: 2
    },
    {
      prompt: 'أكمل الآية: قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
      options: ['إِلَٰهِ النَّاسِ', 'مَلِكِ النَّاسِ', 'مِنْ شَرِّ مَا خَلَقَ', 'مَالِكِ يَوْمِ الدِّينِ'],
      correct: 1
    },
    {
      prompt: 'أكمل الآية: مَلِكِ النَّاسِ',
      options: ['إِلَٰهِ النَّاسِ', 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', 'لَمْ يَلِدْ وَلَمْ يُولَدْ', 'وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ'],
      correct: 0
    }
  ];

  const handleAnswer = (selectedIndex: number) => {
    if (isAnswering) {
      return;
    }

    setIsAnswering(true);
    const isCorrect = selectedIndex === challenges[currentChallenge].correct;
    const nextCorrectAnswers = isCorrect ? correctAnswers + 1 : correctAnswers;

    if (currentChallenge < challenges.length - 1) {
      setCorrectAnswers(nextCorrectAnswers);
      setTimeout(() => {
        setCurrentChallenge((prev) => prev + 1);
        setIsAnswering(false);
      }, 350);
      return;
    }

    const finalScore = Math.round((nextCorrectAnswers / challenges.length) * 100);
    onScore(finalScore);
    setTimeout(onComplete, 800);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-slate-500 mb-2">جولة {currentChallenge + 1} من {challenges.length}</p>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className="h-full bg-amber-500 rounded-full transition-all"
            style={{ width: `${((currentChallenge + 1) / challenges.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
        <p className="text-lg font-arabic">{challenges[currentChallenge].prompt}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {challenges[currentChallenge].options.map((option, index) => (
          <Button
            key={option}
            variant="outline"
            className="h-auto py-4 text-right whitespace-normal"
            onClick={() => handleAnswer(index)}
            disabled={isAnswering}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function Kids() {
  const { darkMode, addPoints, userProgress } = useQuran();
  const [activeGame, setActiveGame] = useState<KidsGame | null>(null);
  const [gameScore, setGameScore] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [orderingSeed, setOrderingSeed] = useState(() => Date.now());

  const handleGameComplete = () => {
    setShowReward(true);
    addPoints(gameScore);
    setTotalScore(prev => prev + gameScore);
  };

  const handleScore = (score: number) => {
    setGameScore(score);
  };

  const resetGame = () => {
    setActiveGame(null);
    setGameScore(0);
    setShowReward(false);
  };
  const kidsInfoStats = [
    { label: 'نقاط الجلسة', value: totalScore },
    { label: 'إجمالي النقاط', value: userProgress.points },
    { label: 'الاستمرارية', value: `${userProgress.streak} يوم` },
    { label: 'الألعاب المتاحة', value: 4 }
  ];

  return (
    <div className={`app-page-shell transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-white' : 'bg-gradient-to-br from-pink-50 to-purple-50 text-slate-800'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-[55] border-b backdrop-blur-xl shadow-sm ${darkMode ? 'bg-slate-900/78 border-slate-700' : 'bg-white/78 border-pink-200'}`}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AppLogo size="md" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl" />
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  مصحف الأطفال
                </h1>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  ألعاب تعليمية ممتعة للقرآن
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-pink-100'}`}>
                <Trophy className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-sm sm:text-base">{totalScore}</span>
              </div>
              
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-purple-100'}`}>
                <Star className="w-5 h-5 text-purple-500" />
                <span className="font-bold text-sm sm:text-base">{userProgress.points}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-page-main max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {!activeGame ? (
          <>
            <PageInfoPanel
              darkMode={darkMode}
              accent="rose"
              className="mb-6"
              title="معلومات صفحة الأطفال"
              description="أنشطة تفاعلية تساعد الطفل على ربط الآيات بالسور وحفظ الترتيب بطريقة مبسطة."
              tips={[
                'ابدأ باللعبة السهلة ثم انتقل تدريجيًا للمستويات الأعلى.',
                'كرّر نفس اللعبة أكثر من مرة لرفع التثبيت.',
                'تابع نقاط الجلسة كتحفيز بدون ضغط على الطفل.'
              ]}
              stats={kidsInfoStats}
            />

            {/* Welcome Banner */}
            <Card className={`mb-6 overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-pink-200'}`}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 opacity-90" />
                <div className="relative p-5 sm:p-8 text-white text-center">
                  <PartyPopper className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4" />
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">مرحباً بك في مصحف الأطفال!</h2>
                  <p className="text-sm sm:text-lg opacity-90">تعلم القرآن بطريقة ممتعة ومسلية</p>
                </div>
              </div>
            </Card>

            {/* Games Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Matching Game */}
              <Card 
                className={`cursor-pointer transition-all hover:scale-105 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-pink-200'}`}
                onClick={() => setActiveGame('matching')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                      <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold mb-1">توصيل الآيات</h3>
                      <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        وصل الآية بسورتها الصحيحة
                      </p>
                      <Badge className="mt-2 bg-green-500">سهل</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ordering Game */}
              <Card 
                className={`cursor-pointer transition-all hover:scale-105 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-pink-200'}`}
                onClick={() => {
                  setOrderingSeed(Date.now());
                  setActiveGame('ordering');
                }}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold mb-1">ترتيب السور</h3>
                      <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        رتب السور حسب ترتيبها
                      </p>
                      <Badge className="mt-2 bg-yellow-500">متوسط</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Completion Game */}
              <Card 
                className={`cursor-pointer transition-all hover:scale-105 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-pink-200'}`}
                onClick={() => setActiveGame('completion')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                      <Lightbulb className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold mb-1">اكمل الآية</h3>
                      <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        خمن السورة من الآية
                      </p>
                      <Badge className="mt-2 bg-yellow-500">متوسط</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Memorization Challenge */}
              <Card 
                className={`cursor-pointer transition-all hover:scale-105 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-pink-200'}`}
                onClick={() => setActiveGame('memorization')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Star className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold mb-1">تحدي الحفظ</h3>
                      <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        احفظ الآية في وقت محدد
                      </p>
                      <Badge className="mt-2 bg-red-500">صعب</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tips for Kids */}
            <Card className={`mt-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  نصائح للتعلم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className={`space-y-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-1" />
                    <span>استمع للآية عدة مرات قبل محاولة حفظها</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-1" />
                    <span>كرر الآية بصوت مسموع</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-1" />
                    <span>افهم معنى الآية لتسهيل حفظها</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-1" />
                    <span>راجع ما حفظته يومياً</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Active Game */
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-pink-200'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {activeGame === 'matching' && 'توصيل الآيات'}
                  {activeGame === 'ordering' && 'ترتيب السور'}
                  {activeGame === 'completion' && 'أكمل الآية'}
                  {activeGame === 'memorization' && 'تحدي الحفظ'}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={resetGame}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  إعادة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeGame === 'matching' && (
                <MatchingGame onComplete={handleGameComplete} onScore={handleScore} />
              )}
              {activeGame === 'ordering' && (
                <OrderingGame onComplete={handleGameComplete} onScore={handleScore} shuffleSeed={orderingSeed} />
              )}
              {activeGame === 'completion' && (
                <CompletionGame onComplete={handleGameComplete} onScore={handleScore} />
              )}
              {activeGame === 'memorization' && (
                <MemorizationGame onComplete={handleGameComplete} onScore={handleScore} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Reward Dialog */}
        <Dialog open={showReward} onOpenChange={setShowReward}>
          <DialogContent className="text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl sm:text-3xl">
                <PartyPopper className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-amber-500" />
                أحسنت!
              </DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <p className="text-xl mb-4">لقد أكملت اللعبة بنجاح!</p>
              <div className="flex items-center justify-center gap-4">
                <Badge className="text-lg px-4 py-2 bg-amber-500">
                  <Star className="w-5 h-5 mr-2" />
                  +{gameScore} نقطة
                </Badge>
              </div>
            </div>
            <Button onClick={resetGame} className="w-full bg-gradient-to-r from-pink-500 to-purple-500">
              العب مرة أخرى
            </Button>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
