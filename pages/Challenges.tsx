import { useMemo, useState } from 'react';
import { useQuran } from '@/context/QuranContext';
import { dailyChallenges, achievements, titles } from '@/data/quran';
import { 
  Target, 
  Trophy, 
  Star, 
  Flame, 
  Lock,
  Unlock,
  Check,
  Sparkles,
  Zap,
  Crown,
  Medal,
  Gem,
  Search,
  SlidersHorizontal,
  FilterX,
  ArrowUpDown,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLogo from '@/components/app-logo';
import PageInfoPanel from '@/components/page-info-panel';

type ChallengesTab = 'challenges' | 'achievements';
type ChallengeDifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
type ChallengeStatusFilter = 'all' | 'completed' | 'pending';
type ChallengeSort = 'default' | 'points_desc' | 'points_asc' | 'easy_first' | 'hard_first';
type AchievementStatusFilter = 'all' | 'unlocked' | 'locked';
type AchievementSort = 'default' | 'points_desc' | 'points_asc';

const challengeDifficultyOptions: Array<[ChallengeDifficultyFilter, string]> = [
  ['all', 'الكل'],
  ['easy', 'سهل'],
  ['medium', 'متوسط'],
  ['hard', 'صعب']
];

const challengeStatusOptions: Array<[ChallengeStatusFilter, string]> = [
  ['all', 'الكل'],
  ['pending', 'غير مكتمل'],
  ['completed', 'مكتمل']
];

const challengeSortOptions: Array<[ChallengeSort, string]> = [
  ['default', 'ترتيب افتراضي'],
  ['points_desc', 'أعلى نقاط'],
  ['points_asc', 'أقل نقاط'],
  ['hard_first', 'الأصعب أولًا'],
  ['easy_first', 'الأسهل أولًا']
];

const achievementStatusOptions: Array<[AchievementStatusFilter, string]> = [
  ['all', 'الكل'],
  ['unlocked', 'مفتوح'],
  ['locked', 'مقفول']
];

const achievementSortOptions: Array<[AchievementSort, string]> = [
  ['default', 'ترتيب افتراضي'],
  ['points_desc', 'أعلى نقاط'],
  ['points_asc', 'أقل نقاط']
];

const difficultyOrderWeight: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3
};

function normalizeSearchText(value: string): string {
  return value
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .toLowerCase()
    .trim();
}

function sortChallenges(
  a: (typeof dailyChallenges)[number],
  b: (typeof dailyChallenges)[number],
  sort: ChallengeSort
): number {
  if (sort === 'points_desc') return b.points - a.points;
  if (sort === 'points_asc') return a.points - b.points;

  const rankA = difficultyOrderWeight[a.difficulty] ?? 99;
  const rankB = difficultyOrderWeight[b.difficulty] ?? 99;

  if (sort === 'easy_first') {
    if (rankA === rankB) return b.points - a.points;
    return rankA - rankB;
  }

  if (sort === 'hard_first') {
    if (rankA === rankB) return b.points - a.points;
    return rankB - rankA;
  }

  return a.id - b.id;
}

function sortAchievements(
  a: (typeof achievements)[number],
  b: (typeof achievements)[number],
  sort: AchievementSort
): number {
  if (sort === 'points_desc') return b.points - a.points;
  if (sort === 'points_asc') return a.points - b.points;
  return a.id - b.id;
}

export default function Challenges() {
  const { 
    userProgress, 
    completeChallenge, 
    unlockAchievement,
    darkMode
  } = useQuran();

  const [activeTab, setActiveTab] = useState<ChallengesTab>('challenges');
  const [selectedAchievement, setSelectedAchievement] = useState<typeof achievements[0] | null>(null);
  const [challengeSearchQuery, setChallengeSearchQuery] = useState('');
  const [challengeDifficultyFilter, setChallengeDifficultyFilter] = useState<ChallengeDifficultyFilter>('all');
  const [challengeStatusFilter, setChallengeStatusFilter] = useState<ChallengeStatusFilter>('all');
  const [challengeSort, setChallengeSort] = useState<ChallengeSort>('default');
  const [achievementSearchQuery, setAchievementSearchQuery] = useState('');
  const [achievementStatusFilter, setAchievementStatusFilter] = useState<AchievementStatusFilter>('all');
  const [achievementSort, setAchievementSort] = useState<AchievementSort>('default');

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-600 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      case 'hard': return 'bg-rose-600 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getDifficultyTone = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-500';
      case 'medium': return 'bg-amber-500';
      case 'hard': return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  // Get difficulty label
  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'سهل';
      case 'medium': return 'متوسط';
      case 'hard': return 'صعب';
      default: return 'عادي';
    }
  };

  const getAchievementTier = (points: number) => {
    if (points >= 500) return 'أسطوري';
    if (points >= 200) return 'ذهبي';
    if (points >= 100) return 'فضي';
    return 'برونزي';
  };

  // Calculate total progress
  const challengesProgress = (userProgress.completedChallenges.length / dailyChallenges.length) * 100;
  const achievementsProgress = (userProgress.unlockedAchievements.length / achievements.length) * 100;
  const completedChallengeSet = useMemo(() => new Set(userProgress.completedChallenges), [userProgress.completedChallenges]);
  const unlockedAchievementSet = useMemo(() => new Set(userProgress.unlockedAchievements), [userProgress.unlockedAchievements]);
  const filteredChallenges = useMemo(() => {
    const normalizedSearch = normalizeSearchText(challengeSearchQuery);

    const filtered = dailyChallenges.filter((challenge) => {
      if (challengeDifficultyFilter !== 'all' && challenge.difficulty !== challengeDifficultyFilter) {
        return false;
      }

      const isCompleted = completedChallengeSet.has(challenge.id);
      if (challengeStatusFilter === 'completed' && !isCompleted) {
        return false;
      }
      if (challengeStatusFilter === 'pending' && isCompleted) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [
        challenge.title,
        challenge.description,
        getDifficultyLabel(challenge.difficulty),
        challenge.points.toString()
      ].map((value) => normalizeSearchText(value));

      return searchable.some((value) => value.includes(normalizedSearch));
    });

    return [...filtered].sort((a, b) => sortChallenges(a, b, challengeSort));
  }, [challengeSearchQuery, challengeDifficultyFilter, challengeStatusFilter, challengeSort, completedChallengeSet]);

  const filteredAchievements = useMemo(() => {
    const normalizedSearch = normalizeSearchText(achievementSearchQuery);

    const filtered = achievements.filter((achievement) => {
      const isUnlocked = unlockedAchievementSet.has(achievement.id);

      if (achievementStatusFilter === 'unlocked' && !isUnlocked) {
        return false;
      }
      if (achievementStatusFilter === 'locked' && isUnlocked) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [
        achievement.title,
        achievement.description,
        achievement.points.toString(),
        getAchievementTier(achievement.points)
      ].map((value) => normalizeSearchText(value));

      return searchable.some((value) => value.includes(normalizedSearch));
    });
    return [...filtered].sort((a, b) => sortAchievements(a, b, achievementSort));
  }, [achievementSearchQuery, achievementStatusFilter, achievementSort, unlockedAchievementSet]);

  const easyChallengesCount = dailyChallenges.filter((challenge) => challenge.difficulty === 'easy').length;
  const completedEasyChallenges = dailyChallenges.filter((challenge) => challenge.difficulty === 'easy' && completedChallengeSet.has(challenge.id)).length;
  const pendingChallengesCount = Math.max(0, dailyChallenges.length - userProgress.completedChallenges.length);
  const lockedAchievementsCount = Math.max(0, achievements.length - userProgress.unlockedAchievements.length);
  const filteredCompletedChallengesCount = filteredChallenges.filter((challenge) =>
    completedChallengeSet.has(challenge.id)
  ).length;
  const filteredPendingChallengesCount = Math.max(0, filteredChallenges.length - filteredCompletedChallengesCount);
  const filteredUnlockedAchievementsCount = filteredAchievements.filter((achievement) =>
    unlockedAchievementSet.has(achievement.id)
  ).length;

  // Get current title info
  const currentTitle = titles.find(t => t.name === userProgress.title) || titles[0];
  const nextTitle = titles.find(t => t.minPoints > userProgress.points);
  const pointsToNextTitle = nextTitle ? Math.max(0, nextTitle.minPoints - userProgress.points) : 0;
  const titleProgress = nextTitle
    ? Math.min(
      100,
      ((Math.max(0, userProgress.points - currentTitle.minPoints) /
        Math.max(1, nextTitle.minPoints - currentTitle.minPoints)) *
        100)
    )
    : 100;

  const difficultyProgress = useMemo(
    () =>
      (['easy', 'medium', 'hard'] as const).map((difficulty) => {
        const total = dailyChallenges.filter((challenge) => challenge.difficulty === difficulty).length;
        const completed = dailyChallenges.filter(
          (challenge) => challenge.difficulty === difficulty && completedChallengeSet.has(challenge.id)
        ).length;

        return {
          difficulty,
          label: getDifficultyLabel(difficulty),
          total,
          completed,
          percent: total > 0 ? (completed / total) * 100 : 0
        };
      }),
    [completedChallengeSet]
  );

  const challengeFiltersActive =
    challengeSearchQuery.trim().length > 0 ||
    challengeDifficultyFilter !== 'all' ||
    challengeStatusFilter !== 'all' ||
    challengeSort !== 'default';

  const achievementFiltersActive =
    achievementSearchQuery.trim().length > 0 ||
    achievementStatusFilter !== 'all' ||
    achievementSort !== 'default';
  const challengesInfoStats = [
    { label: 'نقاطك', value: userProgress.points },
    { label: 'تحديات مكتملة', value: userProgress.completedChallenges.length },
    { label: 'إنجازات مفتوحة', value: userProgress.unlockedAchievements.length },
    { label: 'نتائج الفلاتر', value: filteredChallenges.length }
  ];

  const filterChipClass = (isActive: boolean, tone: 'emerald' | 'teal' | 'amber') =>
    `shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      isActive
        ? tone === 'emerald'
          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300'
          : tone === 'teal'
            ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/25 dark:text-teal-300'
            : 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300'
        : darkMode
          ? 'border-slate-700 bg-slate-900/40 text-slate-300 hover:bg-slate-800'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
    }`;

  const resetChallengeFilters = () => {
    setChallengeSearchQuery('');
    setChallengeDifficultyFilter('all');
    setChallengeStatusFilter('all');
    setChallengeSort('default');
  };

  const resetAchievementFilters = () => {
    setAchievementSearchQuery('');
    setAchievementStatusFilter('all');
    setAchievementSort('default');
  };

  return (
    <div className={`app-page-shell spiritual-page-bg transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
      <header className={`sticky top-0 z-[55] border-b backdrop-blur-xl shadow-sm ${darkMode ? 'bg-slate-900/78 border-slate-700' : 'bg-white/78 border-emerald-100'}`}>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AppLogo size="md" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-emerald-700 via-teal-600 to-amber-600 bg-clip-text text-transparent truncate">
                  التحديات والإنجازات
                </h1>
                <p className={`text-[11px] sm:text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  لوحة يومية أوضح لمتابعة التقدم والتحفيز
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-amber-500 text-white">المستوى {userProgress.level}</Badge>
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-amber-50 border border-amber-200'}`}>
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-sm">{userProgress.title}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-page-main max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <PageInfoPanel
          darkMode={darkMode}
          accent="violet"
          className="mb-5"
          title="معلومات صفحة التحديات"
          description="تابع مستوى تقدمك اليومي، ثم استخدم الفلاتر لاختيار التحدي المناسب لقدرتك الحالية."
          tips={[
            'ابدأ بالتحديات السهلة لرفع الاستمرارية اليومية.',
            'غيّر ترتيب العرض حسب النقاط لاختيار الأعلى أثرًا أولًا.',
            'افتح صفحة الإنجازات كل فترة لمراجعة ما تبقى.'
          ]}
          stats={challengesInfoStats}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 mb-5">
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'} shadow-sm`}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Trophy className="w-6 h-6 sm:w-7 sm:h-7 mx-auto mb-1.5 text-amber-500" />
              <p className="text-xl sm:text-2xl font-bold">{userProgress.points}</p>
              <p className="text-[11px] sm:text-xs text-slate-500">نقطة</p>
            </CardContent>
          </Card>

          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'} shadow-sm`}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Flame className="w-6 h-6 sm:w-7 sm:h-7 mx-auto mb-1.5 text-orange-500" />
              <p className="text-xl sm:text-2xl font-bold">{userProgress.streak}</p>
              <p className="text-[11px] sm:text-xs text-slate-500">يوم متتالي</p>
            </CardContent>
          </Card>

          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'} shadow-sm`}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Target className="w-6 h-6 sm:w-7 sm:h-7 mx-auto mb-1.5 text-teal-500" />
              <p className="text-xl sm:text-2xl font-bold">{userProgress.completedChallenges.length}</p>
              <p className="text-[11px] sm:text-xs text-slate-500">تحدي منجز</p>
            </CardContent>
          </Card>

          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'} shadow-sm`}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Medal className="w-6 h-6 sm:w-7 sm:h-7 mx-auto mb-1.5 text-emerald-500" />
              <p className="text-xl sm:text-2xl font-bold">{userProgress.unlockedAchievements.length}</p>
              <p className="text-[11px] sm:text-xs text-slate-500">إنجاز مكتمل</p>
            </CardContent>
          </Card>
        </div>

        <Card className={`mb-5 ${darkMode ? 'bg-slate-800 border-slate-700' : 'spiritual-surface'}`}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-700' : 'bg-amber-100 border border-amber-200'}`}>
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">لقبك الحالي: {currentTitle.name}</h2>
                  {nextTitle ? (
                    <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      اللقب التالي: {nextTitle.name} ({pointsToNextTitle} نقطة)
                    </p>
                  ) : (
                    <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      وصلت لأعلى لقب متاح، بارك الله فيك.
                    </p>
                  )}
                </div>
              </div>
              <Badge className="bg-amber-500 text-white self-start sm:self-auto">المستوى {userProgress.level}</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span>التقدم للقب التالي</span>
                <span>{userProgress.points} / {nextTitle ? nextTitle.minPoints : userProgress.points}</span>
              </div>
              <Progress value={titleProgress} className="h-2.5" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
              {difficultyProgress.map((item) => (
                <div key={item.difficulty} className={`rounded-xl border p-2.5 ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-emerald-100 bg-white/80'}`}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span>{item.label}</span>
                    <span>{item.completed}/{item.total}</span>
                  </div>
                  <Progress value={item.percent} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={`mb-5 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-bold text-base sm:text-lg">ملخص سريع</h3>
              <Badge variant="outline">{activeTab === 'challenges' ? 'التحديات' : 'الإنجازات'}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-emerald-100 bg-emerald-50/70'}`}>
                <p className="text-xs">سهل مكتمل</p>
                <p className="text-lg font-bold text-emerald-600">{completedEasyChallenges}/{easyChallengesCount}</p>
              </div>
              <div className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-emerald-100 bg-amber-50/70'}`}>
                <p className="text-xs">تحديات متبقية</p>
                <p className="text-lg font-bold text-amber-600">{pendingChallengesCount}</p>
              </div>
              <div className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-emerald-100 bg-blue-50/70'}`}>
                <p className="text-xs">إنجازات مقفلة</p>
                <p className="text-lg font-bold text-blue-600">{lockedAchievementsCount}</p>
              </div>
              <div className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-emerald-100 bg-purple-50/70'}`}>
                <p className="text-xs">النقاط للقب التالي</p>
                <p className="text-lg font-bold text-purple-600">{pointsToNextTitle}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ChallengesTab)}>
          <TabsList className={`grid grid-cols-2 mb-5 h-auto p-1.5 gap-1 ${darkMode ? 'bg-slate-900/70 border border-slate-700' : 'bg-white/80 border border-emerald-100'}`}>
            <TabsTrigger value="challenges" className="py-2.5">
              <Target className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">التحديات اليومية</span>
              <span className="sm:hidden">التحديات</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="py-2.5">
              <Trophy className="w-4 h-4 mr-2" />
              الإنجازات
            </TabsTrigger>
          </TabsList>

          {/* Challenges Tab */}
          <TabsContent value="challenges">
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-500" />
                    تحديات اليوم
                  </CardTitle>
                  <Badge variant="outline">
                    {filteredChallenges.length}/{dailyChallenges.length}
                  </Badge>
                </div>
                <Progress value={challengesProgress} className="h-2 mt-2" />

                <div className={`mt-4 rounded-2xl border p-3 sm:p-4 ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-emerald-100 bg-emerald-50/40'}`}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                      <p className="font-semibold text-sm sm:text-base">فلاتر التحديات</p>
                    </div>
                    {challengeFiltersActive && (
                      <Button type="button" variant="outline" size="sm" onClick={resetChallengeFilters} className="h-8 px-2.5 text-xs">
                        <FilterX className="w-3.5 h-3.5 mr-1" />
                        إعادة ضبط
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={challengeSearchQuery}
                        onChange={(event) => setChallengeSearchQuery(event.target.value)}
                        placeholder="ابحث في التحديات..."
                        className="pl-10 h-10"
                      />
                    </div>

                    <div>
                      <p className={`text-xs mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>المستوى</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                        {challengeDifficultyOptions.map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setChallengeDifficultyFilter(value)}
                            className={filterChipClass(challengeDifficultyFilter === value, 'emerald')}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className={`text-xs mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>الحالة</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                        {challengeStatusOptions.map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setChallengeStatusFilter(value)}
                            className={filterChipClass(challengeStatusFilter === value, 'teal')}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className={`text-xs mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpDown className="w-3.5 h-3.5" />
                          ترتيب العرض
                        </span>
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                        {challengeSortOptions.map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setChallengeSort(value)}
                            className={filterChipClass(challengeSort === value, 'amber')}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className={`rounded-lg border px-2 py-2 text-center ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-emerald-100 bg-white/90'}`}>
                        <p className="text-[11px] text-slate-500">النتائج</p>
                        <p className="font-bold text-sm">{filteredChallenges.length}</p>
                      </div>
                      <div className={`rounded-lg border px-2 py-2 text-center ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-emerald-100 bg-white/90'}`}>
                        <p className="text-[11px] text-slate-500">مكتمل</p>
                        <p className="font-bold text-sm text-emerald-600">{filteredCompletedChallengesCount}</p>
                      </div>
                      <div className={`rounded-lg border px-2 py-2 text-center ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-emerald-100 bg-white/90'}`}>
                        <p className="text-[11px] text-slate-500">متبقي</p>
                        <p className="font-bold text-sm text-amber-600">{filteredPendingChallengesCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3.5">
                  {filteredChallenges.map(challenge => {
                    const isCompleted = completedChallengeSet.has(challenge.id);
                    
                    return (
                      <div
                        key={challenge.id}
                        className={`rounded-2xl border p-3.5 sm:p-4 transition-all ${
                          isCompleted 
                            ? 'border-emerald-400 bg-emerald-50/80 dark:bg-emerald-900/15' 
                            : darkMode ? 'border-slate-700 bg-slate-900/30' : 'border-emerald-100 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-1.5 self-stretch rounded-full ${getDifficultyTone(challenge.difficulty)}`} />

                          <div className="flex-1 min-w-0 text-center">
                            <div className="flex flex-col items-center gap-2 mb-1.5">
                              <h3 className="font-bold text-sm sm:text-base">{challenge.title}</h3>
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                                isCompleted ? 'bg-emerald-500 text-white' : darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {isCompleted ? <Check className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                              </div>
                            </div>

                            <p className={`text-xs sm:text-sm leading-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              {challenge.description}
                            </p>

                            <div className="flex items-center justify-center gap-2 flex-wrap mt-3">
                              <Badge className={getDifficultyColor(challenge.difficulty)}>
                                {getDifficultyLabel(challenge.difficulty)}
                              </Badge>
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                <Star className="w-3 h-3 mr-1" />
                                +{challenge.points} نقطة
                              </Badge>
                              
                              {isCompleted ? (
                                <Badge className="bg-emerald-600 text-white">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  مكتمل
                                </Badge>
                              ) : (
                                <Badge variant="outline">قابل للتنفيذ الآن</Badge>
                              )}
                            </div>

                            {!isCompleted && (
                              <Button 
                                size="sm" 
                                onClick={() => completeChallenge(challenge.id)}
                                className="mt-3 w-full sm:w-auto sm:mx-auto bg-emerald-600 hover:bg-emerald-700"
                              >
                                إنجاز التحدي
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredChallenges.length === 0 && (
                    <div className={`rounded-xl border p-6 text-center text-sm ${darkMode ? 'border-slate-700 text-slate-400' : 'border-emerald-100 text-slate-500'}`}>
                      <p>لا توجد تحديات مطابقة للفلاتر الحالية.</p>
                      {challengeFiltersActive && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={resetChallengeFilters}>
                          إعادة ضبط الفلاتر
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Gem className="w-5 h-5 text-amber-500" />
                    الإنجازات
                  </CardTitle>
                  <Badge variant="outline">
                    {filteredAchievements.length}/{achievements.length}
                  </Badge>
                </div>
                <Progress value={achievementsProgress} className="h-2 mt-2" />

                <div className={`mt-4 rounded-2xl border p-3 sm:p-4 ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-amber-100 bg-amber-50/35'}`}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                      <p className="font-semibold text-sm sm:text-base">فلاتر الإنجازات</p>
                    </div>
                    {achievementFiltersActive && (
                      <Button type="button" variant="outline" size="sm" onClick={resetAchievementFilters} className="h-8 px-2.5 text-xs">
                        <FilterX className="w-3.5 h-3.5 mr-1" />
                        إعادة ضبط
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={achievementSearchQuery}
                        onChange={(event) => setAchievementSearchQuery(event.target.value)}
                        placeholder="ابحث في الإنجازات..."
                        className="pl-10 h-10"
                      />
                    </div>

                    <div>
                      <p className={`text-xs mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>الحالة</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                        {achievementStatusOptions.map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setAchievementStatusFilter(value)}
                            className={filterChipClass(achievementStatusFilter === value, 'teal')}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className={`text-xs mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpDown className="w-3.5 h-3.5" />
                          ترتيب العرض
                        </span>
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                        {achievementSortOptions.map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setAchievementSort(value)}
                            className={filterChipClass(achievementSort === value, 'amber')}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className={`rounded-lg border px-2 py-2 text-center ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-amber-100 bg-white/90'}`}>
                        <p className="text-[11px] text-slate-500">النتائج</p>
                        <p className="font-bold text-sm">{filteredAchievements.length}</p>
                      </div>
                      <div className={`rounded-lg border px-2 py-2 text-center ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-amber-100 bg-white/90'}`}>
                        <p className="text-[11px] text-slate-500">مفتوح</p>
                        <p className="font-bold text-sm text-emerald-600">{filteredUnlockedAchievementsCount}</p>
                      </div>
                      <div className={`rounded-lg border px-2 py-2 text-center ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-amber-100 bg-white/90'}`}>
                        <p className="text-[11px] text-slate-500">مقفول</p>
                        <p className="font-bold text-sm text-amber-600">
                          {Math.max(0, filteredAchievements.length - filteredUnlockedAchievementsCount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
               
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredAchievements.map(achievement => {
                    const isUnlocked = unlockedAchievementSet.has(achievement.id);
                    
                    return (
                      <button
                        key={achievement.id}
                        type="button"
                        onClick={() => setSelectedAchievement(achievement)}
                        className={`w-full rounded-2xl border p-4 text-right transition-all ${
                          isUnlocked 
                            ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-amber-950/20'
                            : darkMode ? 'border-slate-700 bg-slate-900/40 opacity-80' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 ${
                            isUnlocked ? 'bg-amber-200 dark:bg-amber-900/30' : darkMode ? 'bg-slate-700' : 'bg-slate-200'
                          }`}>
                            {isUnlocked ? achievement.icon : <Lock className="w-5 h-5 text-slate-500" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <h3 className={`font-bold text-sm sm:text-base ${isUnlocked ? '' : darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                {achievement.title}
                              </h3>
                              <Badge className={isUnlocked ? 'bg-amber-500 text-white' : ''} variant={isUnlocked ? 'default' : 'secondary'}>
                                {getAchievementTier(achievement.points)}
                              </Badge>
                            </div>

                            <p className={`text-xs sm:text-sm leading-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {achievement.description}
                            </p>

                            <div className="flex items-center gap-2 flex-wrap mt-3">
                              <Badge variant="secondary" className={isUnlocked ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : ''}>
                                <Star className="w-3 h-3 mr-1" />
                                +{achievement.points} نقطة
                              </Badge>
                              <Badge variant={isUnlocked ? 'default' : 'outline'} className={isUnlocked ? 'bg-emerald-600 text-white' : ''}>
                                {isUnlocked ? 'مفتوح' : 'مقفول'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredAchievements.length === 0 && (
                    <div className={`md:col-span-2 rounded-xl border p-6 text-center text-sm ${darkMode ? 'border-slate-700 text-slate-400' : 'border-emerald-100 text-slate-500'}`}>
                      <p>لا توجد إنجازات مطابقة للفلاتر الحالية.</p>
                      {achievementFiltersActive && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={resetAchievementFilters}>
                          إعادة ضبط الفلاتر
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Achievement Detail Dialog */}
        <Dialog open={selectedAchievement !== null} onOpenChange={() => setSelectedAchievement(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-center">
                <div className="text-6xl mb-4">{selectedAchievement?.icon}</div>
                {selectedAchievement?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="text-center">
              <p className="text-lg mb-4">{selectedAchievement?.description}</p>
              <Badge className="bg-amber-500 text-lg px-4 py-2">
                <Star className="w-4 h-4 mr-2" />
                +{selectedAchievement?.points} نقطة
              </Badge>
              
              {selectedAchievement && !unlockedAchievementSet.has(selectedAchievement.id) && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500 mb-2">لم يتم إنجاز هذا الإنجاز بعد</p>
                  <Button 
                    onClick={() => {
                      unlockAchievement(selectedAchievement.id);
                      setSelectedAchievement(null);
                    }}
                    className="bg-gradient-to-r from-amber-500 to-orange-500"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    فتح الإنجاز
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Motivation Quote */}
        <Card className={`mt-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-emerald-50 to-amber-50 border-emerald-200'}`}>
          <CardContent className="p-6 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-4 text-emerald-500" />
            <p className="text-xl font-bold mb-2">
              "الْأَعْمَالُ بِالنِّيَّاتِ"
            </p>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
