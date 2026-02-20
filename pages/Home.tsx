import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuran, type UserActivity } from '@/context/QuranContext';
import { surahs, azkar, hadiths, dailyChallenges } from '@/data/quran';
import { memorizationPlans, memorizationTips } from '@/data/memorization';
import { 
  Book, 
  Trophy, 
  Flame, 
  Moon, 
  Sun,
  Star,
  Target,
  Quote,
  ChevronLeft,
  Sparkles,
  Clock,
  Brain,
  Zap,
  TrendingUp,
  Play,
  Compass,
  BookMarked,
  CheckCircle2,
  type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import AppLogo from '@/components/app-logo';
import PageInfoPanel from '@/components/page-info-panel';

export default function Home() {
  const {
    userProgress, 
    darkMode, 
    toggleDarkMode, 
    setCurrentSurah,
    currentSurah,
    completeChallenge,
    unlockAchievement
  } = useQuran();

  // Check for first visit achievement
  useEffect(() => {
    unlockAchievement(1);
  }, [unlockAchievement]);

  const lastReadSurah = surahs.find(s => s.number === currentSurah) || surahs[0];
  const quickStartSurah = lastReadSurah;
  const today = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const hadithOfMoment =
    hadiths[(userProgress.points + userProgress.totalRead + userProgress.completedChallenges.length) % hadiths.length];

  // Progress to next level
  const nextLevelPoints = userProgress.level * 500;
  const currentLevelPoints = (userProgress.level - 1) * 500;
  const progressPercent = Math.min(
    100,
    Math.max(0, ((userProgress.points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100)
  );
  const homeInfoStats = [
    { label: 'آخر سورة', value: lastReadSurah.name },
    { label: 'آيات مقروءة', value: userProgress.totalRead },
    { label: 'تحديات مكتملة', value: userProgress.completedChallenges.length },
    { label: 'استمرارية', value: `${userProgress.streak} يوم` }
  ];
  const starterRoadmap = [
    {
      id: 1,
      title: 'حدد هدفك اليوم',
      description: 'اختر التحفيظ إذا هدفك الإنجاز اليومي المنظم.',
      action: 'ابدأ التحفيظ',
      href: '/memorize',
      icon: Compass
    },
    {
      id: 2,
      title: 'اقرأ بخطوات بسيطة',
      description: 'ادخل صفحة القراءة، اختر السورة، ثم ابحث داخل الآيات.',
      action: 'افتح القراءة',
      href: '/reader',
      icon: Book
    },
    {
      id: 3,
      title: 'ثبّت العادة اليومية',
      description: 'أنجز تحديًا واحدًا يوميًا للحفاظ على الاستمرار.',
      action: 'شاهد التحديات',
      href: '/challenges',
      icon: CheckCircle2
    }
  ];

  const recentActivities = useMemo(() => userProgress.activityTimeline.slice(0, 5), [userProgress.activityTimeline]);
  const latestActivity = recentActivities[0] ?? null;
  const pendingChallenges = useMemo(
    () => dailyChallenges.filter((challenge) => !userProgress.completedChallenges.includes(challenge.id)),
    [userProgress.completedChallenges]
  );
  const firstPendingChallenge = pendingChallenges[0] ?? null;

  const formatActivityTime = (isoDate: string) => {
    const activityDate = new Date(isoDate);
    if (Number.isNaN(activityDate.getTime())) {
      return 'الآن';
    }

    return activityDate.toLocaleString('ar-EG', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getSurahName = (surahNumber?: number) => {
    if (!surahNumber) {
      return null;
    }

    return surahs.find((surah) => surah.number === surahNumber)?.name ?? null;
  };

  const getActivitySummary = (activity: UserActivity) => {
    const surahName = getSurahName(activity.surah);

    if (activity.type === 'reading') {
      if (surahName && activity.verses) {
        return `قرأت ${activity.verses} آية من سورة ${surahName}.`;
      }
      if (surahName) {
        return `تابعت القراءة في سورة ${surahName}.`;
      }
      return 'أنجزت جلسة قراءة جديدة.';
    }

    if (activity.type === 'memorization') {
      return surahName ? `أضفت سورة ${surahName} ضمن خطة الحفظ.` : 'حدّثت إنجازات الحفظ.';
    }

    if (activity.type === 'challenge') {
      const challengeTitle = dailyChallenges.find((challenge) => challenge.id === activity.challengeId)?.title;
      return challengeTitle ? `أنجزت تحدي: ${challengeTitle}.` : 'أنجزت تحديًا يوميًا جديدًا.';
    }

    if (activity.type === 'favorite') {
      return surahName ? `أضفت سورة ${surahName} إلى المفضلة.` : 'حدّثت قائمة السور المفضلة.';
    }

    if (activity.type === 'bookmark') {
      if (surahName && activity.verse) {
        return `حفظت علامة في سورة ${surahName} عند الآية ${activity.verse}.`;
      }
      return 'حفظت علامة قراءة جديدة.';
    }

    return 'حققت إنجازًا جديدًا في تقدمك.';
  };

  interface SmartSuggestion {
    id: string;
    title: string;
    description: string;
    action: string;
    href: string;
    icon: LucideIcon;
    surahToOpen?: number;
  }

  const smartSuggestions = useMemo<SmartSuggestion[]>(() => {
    const suggestions: SmartSuggestion[] = [];

    const addSuggestion = (suggestion: SmartSuggestion) => {
      if (suggestions.some((item) => item.id === suggestion.id)) {
        return;
      }
      suggestions.push(suggestion);
    };

    if (!latestActivity) {
      addSuggestion({
        id: 'starter-reader',
        title: 'ابدأ جلسة قراءة خفيفة',
        description: 'ابدأ بـ 5 دقائق قراءة حتى يبني المساعد الذكي خطة أدق لتقدمك.',
        action: 'ابدأ القراءة',
        href: '/reader',
        icon: Book,
        surahToOpen: quickStartSurah.number
      });
    } else if (latestActivity.type === 'reading' && latestActivity.surah) {
      const surahName = getSurahName(latestActivity.surah) ?? `سورة رقم ${latestActivity.surah}`;
      addSuggestion({
        id: 'continue-reading',
        title: `تابع من ${surahName}`,
        description: 'بحسب آخر جلسة قراءة، الاستمرارية الآن سترفع تركيزك وتثبّت العادة.',
        action: 'مواصلة القراءة',
        href: '/reader',
        icon: Book,
        surahToOpen: latestActivity.surah
      });
      addSuggestion({
        id: 'move-to-memorize',
        title: 'حوّل القراءة لحفظ عملي',
        description: 'اقترح حفظ 3-5 آيات من نفس الموضع قبل الانتقال لسورة جديدة.',
        action: 'ابدأ الحفظ',
        href: '/memorize',
        icon: Brain
      });
    } else if (latestActivity.type === 'memorization') {
      const surahName = getSurahName(latestActivity.surah);
      addSuggestion({
        id: 'review-memorize',
        title: 'مراجعة مباشرة بعد الحفظ',
        description: surahName
          ? `مراجعة سريعة لسورة ${surahName} الآن ترفع تثبيتك للحفظ.`
          : 'مراجعة مباشرة بعد الحفظ ترفع تثبيتك بشكل واضح.',
        action: 'افتح المراجعة',
        href: '/reader',
        icon: TrendingUp,
        surahToOpen: latestActivity.surah
      });
    } else if (latestActivity.type === 'challenge' && firstPendingChallenge) {
      addSuggestion({
        id: 'next-challenge',
        title: 'أنهِ التحدي التالي',
        description: `آخر نشاطك كان إنجاز تحدٍ. الخطوة التالية: ${firstPendingChallenge.title}.`,
        action: 'افتح التحديات',
        href: '/challenges',
        icon: Target
      });
    } else if (latestActivity.type === 'bookmark' && latestActivity.surah) {
      const surahName = getSurahName(latestActivity.surah) ?? `سورة رقم ${latestActivity.surah}`;
      addSuggestion({
        id: 'resume-bookmark',
        title: `ارجع لعلامتك في ${surahName}`,
        description: 'المساعد يتتبع علاماتك ليوفر رجوعًا سريعًا لنفس نقطة التوقف.',
        action: 'العودة للعلامة',
        href: '/reader',
        icon: BookMarked,
        surahToOpen: latestActivity.surah
      });
    }

    if (userProgress.streak < 3) {
      addSuggestion({
        id: 'streak-boost',
        title: 'حافظ على السلسلة اليومية',
        description: 'هدف اليوم: جلسة قصيرة واحدة تكفي لرفع الاستمرارية.',
        action: 'جلسة سريعة',
        href: '/reader',
        icon: Flame,
        surahToOpen: quickStartSurah.number
      });
    }

    if (pendingChallenges.length > 0) {
      addSuggestion({
        id: 'daily-challenge',
        title: 'نقطة سهلة اليوم',
        description: `لديك ${pendingChallenges.length} تحديات متاحة تزيد نقاط تقدمك بسرعة.`,
        action: 'ابدأ تحديًا',
        href: '/challenges',
        icon: Zap
      });
    }

    if (suggestions.length === 0) {
      addSuggestion({
        id: 'default-plan',
        title: 'خطة ذكية متوازنة',
        description: 'ابدأ قراءة، ثم تحدٍ واحد، ثم مراجعة حفظ قصيرة لإنهاء يوم قوي.',
        action: 'افتح القراءة',
        href: '/reader',
        icon: Compass,
        surahToOpen: quickStartSurah.number
      });
    }

    return suggestions.slice(0, 3);
  }, [firstPendingChallenge, latestActivity, pendingChallenges.length, quickStartSurah.number, userProgress.streak]);

  return (
    <div className={`app-page-shell spiritual-page-bg transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-[55] border-b backdrop-blur-xl shadow-sm ${darkMode ? 'bg-slate-900/78 border-slate-700' : 'bg-white/78 border-emerald-100'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AppLogo size="md" priority className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl" />
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  المصحف الذكي
                </h1>
                <p className={`hidden sm:block text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Smart Quran</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                  className="rounded-full w-8 h-8 sm:w-9 sm:h-9"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
               
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-emerald-100'}`}>
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs sm:text-sm">{userProgress.points}</span>
              </div>
               
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-orange-100'}`}>
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-bold text-xs sm:text-sm">{userProgress.streak}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-page-main max-w-7xl mx-auto px-3 sm:px-4 py-5 sm:py-6">
        <PageInfoPanel
          darkMode={darkMode}
          accent="emerald"
          className="mb-6"
          title="ملخص يومي واضح"
          description="هذه الصفحة تجمع كل مؤشراتك الحالية وتعرض لك نقطة البداية الأسرع للقراءة أو التحفيظ."
          tips={[
            'ابدأ من آخر سورة توقفت عندها للحفاظ على الاستمرارية.',
            'اختر تحديًا يوميًا واحدًا على الأقل للحفاظ على الدافع.',
            'تابع نسبة التقدم للمستوى القادم يوميًا.'
          ]}
          stats={homeInfoStats}
        />

        {/* Welcome Section */}
        <section className="mb-8">
          <Card className="overflow-hidden spiritual-surface">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 via-emerald-600 to-amber-600 opacity-95 islamic-ornament" />
              <div className="relative p-5 sm:p-8 text-white">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-emerald-100 mb-2 text-xs sm:text-sm">{today}</p>
                    <h2 className="text-xl sm:text-3xl font-bold mb-2">
                      أهلاً بك، {userProgress.title} 👋
                    </h2>
                    <p className="text-emerald-100 text-sm sm:text-lg">
                      {userProgress.streak > 0 
                        ? `استمرارك رائع! ${userProgress.streak} أيام متتالية 📖` 
                        : 'ابدأ رحلتك مع القرآن الكريم اليوم'}
                    </p>
                    <div className="dhikr-strip mt-4 rounded-xl px-3 py-2 text-sm sm:text-base">
                      ﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-2">
                      <span className="text-xl sm:text-3xl font-bold">{userProgress.level}</span>
                    </div>
                    <p className="text-xs sm:text-sm">المستوى</p>
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-6">
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span>التقدم للمستوى التالي</span>
                    <span>{userProgress.points} / {nextLevelPoints}</span>
                  </div>
                  <Progress value={progressPercent} className="h-3 bg-white/20" />
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="mb-8">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.35fr]">
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  مساحتك الشخصية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`rounded-2xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-emerald-100 bg-emerald-50/70'}`}>
                  <p className="text-sm opacity-80">الملف الحالي</p>
                  <p className="text-xl font-bold">ملفك المحلي</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    حفظ محلي على نفس الجهاز
                  </p>
                </div>

                <div className={`rounded-2xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-emerald-100 bg-white'}`}>
                  <p className="mb-1 text-xs font-semibold text-emerald-600">آخر نشاط</p>
                  {latestActivity ? (
                    <>
                      <p className="text-sm leading-6">{getActivitySummary(latestActivity)}</p>
                      <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatActivityTime(latestActivity.date)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm leading-6">ابدأ أي خطوة داخل التطبيق، وسأتابع رحلتك وأخصص الاقتراحات لك تلقائيًا.</p>
                  )}
                </div>

                {recentActivities.length > 1 && (
                  <div className={`rounded-2xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-emerald-100 bg-white'}`}>
                    <p className="mb-2 text-xs font-semibold text-emerald-600">تسلسل أنشطتك الأخيرة</p>
                    <div className="space-y-2">
                      {recentActivities.slice(1, 4).map((activity, index) => (
                        <div
                          key={`${activity.date}-${activity.type}-${index}`}
                          className={`rounded-lg px-3 py-2 text-xs ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-emerald-50 text-slate-700'}`}
                        >
                          <p>{getActivitySummary(activity)}</p>
                          <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatActivityTime(activity.date)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5 text-purple-500" />
                  اقتراحات المساعد الذكي
                </CardTitle>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {latestActivity
                    ? `الاقتراحات مبنية على آخر خطوة: ${getActivitySummary(latestActivity)}`
                    : 'الاقتراحات الحالية بداية ذكية. ستتحسن تلقائيًا كلما استخدمت التطبيق أكثر.'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {smartSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className={`rounded-2xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-purple-100 bg-purple-50/40'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <suggestion.icon className="h-4 w-4 shrink-0 text-purple-500" />
                            <p className="font-semibold">{suggestion.title}</p>
                          </div>
                          <p className={`text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {suggestion.description}
                          </p>
                        </div>
                        <Button asChild className="w-full sm:w-auto shrink-0 bg-purple-600 hover:bg-purple-700">
                          <Link
                            to={suggestion.href}
                            onClick={() => {
                              if (suggestion.surahToOpen) {
                                setCurrentSurah(suggestion.surahToOpen);
                              }
                            }}
                          >
                            {suggestion.action}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Starter Guide */}
        <section className="mb-8">
          <Card className="overflow-hidden spiritual-surface">
            <div className={`p-4 sm:p-6 border-b ${darkMode ? 'border-slate-700' : 'border-emerald-100'}`}>
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-emerald-500" />
                ابدأ من هنا
              </h3>
              <p className={`mt-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                مسار واضح وسريع لتستخدم التطبيق بسهولة من أول مرة.
              </p>
            </div>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {starterRoadmap.map((step) => (
                  <div
                    key={step.id}
                    className={`rounded-2xl p-4 border ${darkMode ? 'bg-slate-900 border-emerald-900/40' : 'bg-emerald-50/80 border-emerald-200'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                        {step.id}
                      </div>
                      <step.icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h4 className="font-bold mb-2">{step.title}</h4>
                    <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {step.description}
                    </p>
                    <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                      <Link to={step.href}>
                        {step.action}
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>

              <div className={`mt-5 rounded-2xl p-3 sm:p-4 border ${darkMode ? 'bg-slate-900 border-emerald-900/40' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold">اقتراح سريع لليوم</p>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      ابدأ القراءة من سورة {quickStartSurah?.name} وخُذ 5 دقائق تركيز.
                    </p>
                  </div>
                  <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Link to="/reader" onClick={() => setCurrentSurah(quickStartSurah?.number || 1)}>
                      افتح سورة {quickStartSurah?.name}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quick Actions - Memorization Focus */}
        <section className="mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            ابدأ رحلة التحفيظ
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <Button
              asChild
              variant="outline"
              className={`h-auto py-3 sm:py-6 flex flex-col items-center gap-2 sm:gap-3 w-full ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-emerald-100 hover:bg-emerald-50'}`}
            >
              <Link to="/memorize">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-semibold">وضع التحفيظ</span>
              </Link>
            </Button>
            
            <Button
              asChild
              variant="outline"
              className={`h-auto py-3 sm:py-6 flex flex-col items-center gap-2 sm:gap-3 w-full ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-emerald-100 hover:bg-emerald-50'}`}
            >
              <Link to="/reader">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                  <Book className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-semibold">قراءة القرآن</span>
              </Link>
            </Button>
            
            <Button
              asChild
              variant="outline"
              className={`h-auto py-3 sm:py-6 flex flex-col items-center gap-2 sm:gap-3 w-full ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-emerald-100 hover:bg-emerald-50'}`}
            >
              <Link to="/challenges">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-semibold">التحديات</span>
              </Link>
            </Button>
            
            <Button
              asChild
              variant="outline"
              className={`h-auto py-3 sm:py-6 flex flex-col items-center gap-2 sm:gap-3 w-full ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-emerald-100 hover:bg-emerald-50'}`}
            >
              <Link to="/azkar">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-semibold">الأذكار</span>
              </Link>
            </Button>
          </div>
        </section>

        {/* Memorization Plans */}
        <section className="mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            خطط التحفيظ الجاهزة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {memorizationPlans.slice(0, 3).map(plan => (
              <Card key={plan.id} className={`overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
                <div className="p-4" style={{ backgroundColor: plan.color + '20' }}>
                  <div className="text-4xl mb-2">{plan.icon}</div>
                  <h4 className="font-bold text-lg">{plan.name}</h4>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {plan.description}
                  </p>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>{plan.dailyAmount} آية/يوم</span>
                    <span>{plan.durationDays} يوم</span>
                  </div>
                  <Button asChild className="w-full mt-3" style={{ backgroundColor: plan.color }}>
                    <Link to="/memorize">
                      <Play className="w-4 h-4 mr-2" />
                      ابدأ الآن
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Daily Challenges */}
            <section>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                تحديات اليوم
              </h3>
              <div className="space-y-3">
                {dailyChallenges.slice(0, 3).map(challenge => (
                  <Card key={challenge.id} className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            userProgress.completedChallenges.includes(challenge.id) 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-purple-100 text-purple-600'
                          }`}>
                            {userProgress.completedChallenges.includes(challenge.id) ? (
                              <Star className="w-5 h-5 fill-current" />
                            ) : (
                              <Target className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold">{challenge.title}</h4>
                            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {challenge.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                            +{challenge.points}
                          </Badge>
                          {!userProgress.completedChallenges.includes(challenge.id) && (
                            <Button 
                              size="sm" 
                              onClick={() => completeChallenge(challenge.id)}
                              className="bg-gradient-to-r from-purple-500 to-pink-500"
                            >
                              إنجاز
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Memorization Tips */}
            <section>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                نصائح للحفظ السريع
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {memorizationTips.slice(0, 4).map(tip => (
                  <Card key={tip.id} className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <span className="text-2xl">{tip.icon}</span>
                      <div>
                        <h4 className="font-semibold">{tip.title}</h4>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {tip.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Hadith of the Day */}
            <section>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Quote className="w-5 h-5 text-emerald-500" />
                حديث اليوم
              </h3>
              <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-amber-50 to-emerald-50 border-amber-200'}`}>
                <CardContent className="p-6">
                  <p className="text-lg sm:text-xl leading-relaxed mb-4 font-arabic text-center">
                    "{hadithOfMoment.text}"
                  </p>
                  <div className={`flex items-center justify-between text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>رواه {hadithOfMoment.narrator}</span>
                    <Badge variant="outline">{hadithOfMoment.source}</Badge>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Last Read */}
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-blue-500" />
                  آخر قراءة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lastReadSurah ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">سورة {lastReadSurah.name}</p>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {lastReadSurah.verses} آية
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => setCurrentSurah(lastReadSurah.number)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      مواصلة
                      <ChevronLeft className="w-4 h-4 mr-1" />
                    </Button>
                  </div>
                ) : (
                  <p className={`text-center py-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    لم تقرأ بعد
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Today's Stats */}
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  إحصائيات اليوم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>
                    <p className="text-2xl font-bold text-emerald-600">{userProgress.totalRead}</p>
                    <p className="text-sm">آية مقروءة</p>
                  </div>
                  <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>
                    <p className="text-2xl font-bold text-purple-600">{userProgress.memorizedSurahs.length}</p>
                    <p className="text-sm">سورة محفوظة</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Azkar */}
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  أذكار الصباح
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {azkar.morning.slice(0, 5).map((zikr, index) => (
                      <div key={index} className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-amber-50'}`}>
                        <p className="text-sm leading-relaxed">{zikr.text}</p>
                        <Badge variant="secondary" className="mt-2">
                          {zikr.count} مرات
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  إنجازاتك
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-amber-50'}`}>
                    <p className="text-2xl font-bold text-amber-600">{userProgress.unlockedAchievements.length}</p>
                    <p className="text-sm">إنجاز</p>
                  </div>
                  <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-blue-50'}`}>
                    <p className="text-2xl font-bold text-blue-600">{userProgress.completedChallenges.length}</p>
                    <p className="text-sm">تحدي منجز</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
