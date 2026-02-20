import { useEffect, useMemo, useState } from 'react';
import { useQuran } from '@/context/QuranContext';
import { azkar } from '@/data/quran';
import {
  Sun,
  Moon,
  BookOpen,
  Moon as MoonIcon,
  RotateCcw,
  Check,
  Sparkles,
  Search,
  Minus,
  Plus,
  Copy,
  CheckCheck,
  Clock3,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import AppLogo from '@/components/app-logo';
import PageInfoPanel from '@/components/page-info-panel';
import { getStoredValue, setStoredValue } from '@/lib/user-storage';

type CategoryKey = 'morning' | 'evening' | 'afterPrayer' | 'sleep';
type AzkarViewMode = 'all' | 'remaining' | 'completed';

interface ZikrItem {
  text: string;
  count: number;
}

interface CategoryMeta {
  title: string;
  subtitle: string;
  bestTime: string;
  guidance: string;
  icon: typeof Sun;
  data: ZikrItem[];
}

interface CategoryProgress {
  percentage: number;
  completed: number;
  total: number;
  remaining: number;
  completedItems: number;
  totalItems: number;
}

interface DisplayZikrItem {
  index: number;
  key: string;
  zikr: ZikrItem;
  completed: number;
  remaining: number;
  percentage: number;
  isCompleted: boolean;
}

const AZKAR_PROGRESS_STORAGE_KEY = 'quranAzkarProgress';
const AZKAR_ACTIVE_TAB_STORAGE_KEY = 'quranAzkarActiveTab';

const CATEGORY_KEYS: CategoryKey[] = ['morning', 'evening', 'afterPrayer', 'sleep'];

const ZIKR_CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  morning: {
    title: 'أذكار الصباح',
    subtitle: 'بداية اليوم بطمأنينة وبركة',
    bestTime: 'من الفجر حتى الشروق',
    guidance: 'ابدأ بالأذكار القصيرة ثم أكمل الأذكار ذات التكرار الأعلى.',
    icon: Sun,
    data: azkar.morning
  },
  evening: {
    title: 'أذكار المساء',
    subtitle: 'تحصين النفس قبل نهاية اليوم',
    bestTime: 'بعد العصر حتى قبل النوم',
    guidance: 'ركّز على الأذكار ذات 100 مرة بتدرج ثابت لتجنب الانقطاع.',
    icon: Moon,
    data: azkar.evening
  },
  afterPrayer: {
    title: 'أذكار بعد الصلاة',
    subtitle: 'ورد مختصر بعد كل صلاة',
    bestTime: 'بعد التسليم مباشرة',
    guidance: 'أكمل التسبيح 33/33/33 مع متابعة العداد في البطاقة.',
    icon: BookOpen,
    data: azkar.afterPrayer
  },
  sleep: {
    title: 'أذكار النوم',
    subtitle: 'خاتمة اليوم بسكينة',
    bestTime: 'قبل النوم مباشرة',
    guidance: 'اجعلها عادة يومية ثابتة حتى لو بدأت بأذكار قليلة.',
    icon: MoonIcon,
    data: azkar.sleep
  }
};

function normalizeSearchText(value: string): string {
  return value
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .toLowerCase()
    .trim();
}

function loadStoredAzkarProgress(): Record<string, number> {
  try {
    const raw = getStoredValue(AZKAR_PROGRESS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const sanitized: Record<string, number> = {};

    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        sanitized[key] = Math.trunc(value);
      }
    });

    return sanitized;
  } catch {
    return {};
  }
}

function loadStoredActiveTab(): CategoryKey {
  const saved = getStoredValue(AZKAR_ACTIVE_TAB_STORAGE_KEY);
  return CATEGORY_KEYS.includes(saved as CategoryKey) ? (saved as CategoryKey) : 'morning';
}

export default function Azkar() {
  const { darkMode, addPoints } = useQuran();
  const [activeTab, setActiveTab] = useState<CategoryKey>(() => loadStoredActiveTab());
  const [completedAzkar, setCompletedAzkar] = useState<Record<string, number>>(() => loadStoredAzkarProgress());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<AzkarViewMode>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setStoredValue(AZKAR_PROGRESS_STORAGE_KEY, JSON.stringify(completedAzkar));
  }, [completedAzkar]);

  useEffect(() => {
    setStoredValue(AZKAR_ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    setSearchQuery('');
    setViewMode('all');
  }, [activeTab]);

  const getZikrKey = (category: CategoryKey, index: number) => `${category}-${index}`;

  const incrementZikr = (category: CategoryKey, index: number, target: number, step = 1) => {
    let shouldReward = false;

    setCompletedAzkar((prev) => {
      const key = getZikrKey(category, index);
      const current = Math.min(target, Math.max(0, prev[key] || 0));
      const nextCount = Math.min(target, current + Math.max(1, Math.trunc(step)));

      if (nextCount === current) {
        return prev;
      }

      if (current < target && nextCount === target) {
        shouldReward = true;
      }

      return { ...prev, [key]: nextCount };
    });

    if (shouldReward) {
      addPoints(5);
    }
  };

  const decrementZikr = (category: CategoryKey, index: number, target: number, step = 1) => {
    setCompletedAzkar((prev) => {
      const key = getZikrKey(category, index);
      const current = Math.min(target, Math.max(0, prev[key] || 0));
      const nextCount = Math.max(0, current - Math.max(1, Math.trunc(step)));

      if (nextCount === current) {
        return prev;
      }

      const next = { ...prev };
      if (nextCount === 0) {
        delete next[key];
      } else {
        next[key] = nextCount;
      }
      return next;
    });
  };

  const completeZikr = (category: CategoryKey, index: number, target: number) => {
    let shouldReward = false;

    setCompletedAzkar((prev) => {
      const key = getZikrKey(category, index);
      const current = Math.min(target, Math.max(0, prev[key] || 0));

      if (current >= target) {
        return prev;
      }

      shouldReward = true;
      return { ...prev, [key]: target };
    });

    if (shouldReward) {
      addPoints(5);
    }
  };

  const resetCategory = (category: CategoryKey) => {
    setCompletedAzkar((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${category}-`)) {
          delete next[key];
        }
      });
      return next;
    });
  };

  const resetAll = () => {
    setCompletedAzkar({});
    setCopiedKey(null);
  };

  const handleCopyZikr = async (zikrKey: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(zikrKey);
      setTimeout(() => {
        setCopiedKey((current) => (current === zikrKey ? null : current));
      }, 1200);
    } catch {
      // Ignore clipboard failures.
    }
  };

  const categoryProgress = useMemo(() => {
    const progressMap = {} as Record<CategoryKey, CategoryProgress>;

    CATEGORY_KEYS.forEach((category) => {
      const data = ZIKR_CATEGORIES[category].data;
      let completed = 0;
      let total = 0;
      let completedItems = 0;

      data.forEach((zikr, index) => {
        const current = Math.min(zikr.count, Math.max(0, completedAzkar[getZikrKey(category, index)] || 0));
        completed += current;
        total += zikr.count;
        if (current >= zikr.count) {
          completedItems += 1;
        }
      });

      progressMap[category] = {
        percentage: total === 0 ? 0 : (completed / total) * 100,
        completed,
        total,
        remaining: Math.max(0, total - completed),
        completedItems,
        totalItems: data.length
      };
    });

    return progressMap;
  }, [completedAzkar]);

  const overallProgress = useMemo(() => {
    return CATEGORY_KEYS.reduce(
      (acc, category) => {
        const progress = categoryProgress[category];
        return {
          completed: acc.completed + progress.completed,
          total: acc.total + progress.total,
          completedItems: acc.completedItems + progress.completedItems,
          totalItems: acc.totalItems + progress.totalItems
        };
      },
      { completed: 0, total: 0, completedItems: 0, totalItems: 0 }
    );
  }, [categoryProgress]);

  const overallPercentage = overallProgress.total === 0 ? 0 : (overallProgress.completed / overallProgress.total) * 100;
  const currentCategory = ZIKR_CATEGORIES[activeTab];
  const currentProgress = categoryProgress[activeTab];
  const azkarInfoStats = [
    { label: 'الفئة الحالية', value: currentCategory.title },
    { label: 'التقدم الكلي', value: `${Math.round(overallPercentage)}%` },
    { label: 'مكتمل', value: `${overallProgress.completedItems}/${overallProgress.totalItems}` },
    { label: 'المتبقي', value: currentProgress.remaining }
  ];
  const normalizedSearchQuery = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);

  const filteredAzkar = useMemo<DisplayZikrItem[]>(() => {
    return currentCategory.data
      .map((zikr, index) => {
        const key = getZikrKey(activeTab, index);
        const completed = Math.min(zikr.count, Math.max(0, completedAzkar[key] || 0));
        const remaining = Math.max(0, zikr.count - completed);
        const percentage = zikr.count === 0 ? 0 : (completed / zikr.count) * 100;

        return {
          index,
          key,
          zikr,
          completed,
          remaining,
          percentage,
          isCompleted: completed >= zikr.count
        };
      })
      .filter((item) => {
        if (normalizedSearchQuery && !normalizeSearchText(item.zikr.text).includes(normalizedSearchQuery)) {
          return false;
        }
        if (viewMode === 'remaining' && item.isCompleted) {
          return false;
        }
        if (viewMode === 'completed' && !item.isCompleted) {
          return false;
        }
        return true;
      });
  }, [activeTab, completedAzkar, currentCategory.data, normalizedSearchQuery, viewMode]);

  return (
    <div className={`app-page-shell spiritual-page-bg transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
      <header className={`sticky top-0 z-[55] border-b backdrop-blur-xl shadow-sm ${darkMode ? 'bg-slate-900/78 border-slate-700' : 'bg-white/78 border-emerald-100'}`}>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AppLogo size="md" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl" />
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  الأذكار والأدعية
                </h1>
                <p className={`text-[11px] sm:text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  خطة يومية واضحة مع عداد وتقدم تفصيلي
                </p>
              </div>
            </div>

            <Badge className="bg-emerald-600 text-white">
              {overallProgress.completedItems}/{overallProgress.totalItems} مكتمل
            </Badge>
          </div>
        </div>
      </header>

      <main className="app-page-main max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6">
        <PageInfoPanel
          darkMode={darkMode}
          accent="amber"
          title="معلومات صفحة الأذكار"
          description="تقدر تختار الفئة المناسبة، وتتابع العداد والتقدم اليومي خطوة بخطوة."
          tips={[
            'ابدأ بالفئة الأقرب لوقتك الحالي (صباح، مساء، بعد الصلاة، النوم).',
            'استخدم البحث للوصول السريع للذكر المطلوب.',
            'حوّل العرض إلى المتبقي فقط لإنهاء وردك بسرعة.'
          ]}
          stats={azkarInfoStats}
        />

        <Card className={`spiritual-surface ${darkMode ? 'border-slate-700' : 'border-emerald-100'}`}>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  لوحة التقدم اليومي
                </h2>
                <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  تابع الإنجاز الكلي ثم ادخل للفئة المطلوبة مباشرة.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{overallProgress.completed}/{overallProgress.total} تكرار</Badge>
                <Badge variant="outline">{Math.round(overallPercentage)}%</Badge>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span>التقدم الكلي</span>
                <span>{Math.round(overallPercentage)}%</span>
              </div>
              <Progress value={overallPercentage} className="h-2.5" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CATEGORY_KEYS.map((key) => {
                const category = ZIKR_CATEGORIES[key];
                const progress = categoryProgress[key];
                const Icon = category.icon;
                const isActive = activeTab === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`rounded-xl border p-3 text-right transition-all ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-400/40'
                        : darkMode
                          ? 'border-slate-700 bg-slate-800/70 hover:bg-slate-800'
                          : 'border-emerald-100 bg-white hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : darkMode ? 'text-slate-300' : 'text-emerald-700'}`} />
                      <span className={`text-[11px] rounded-full px-2 py-0.5 ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-emerald-100 text-emerald-700'}`}>
                        {Math.round(progress.percentage)}%
                      </span>
                    </div>
                    <p className="text-sm font-semibold mt-2">{category.title}</p>
                    <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {progress.completedItems}/{progress.totalItems} أذكار مكتملة
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => resetCategory(activeTab)}>
                <RotateCcw className="w-4 h-4 ml-1" />
                إعادة الفئة الحالية
              </Button>
              <Button variant="outline" size="sm" onClick={resetAll}>
                <RotateCcw className="w-4 h-4 ml-1" />
                إعادة الكل
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (CATEGORY_KEYS.includes(value as CategoryKey)) {
              setActiveTab(value as CategoryKey);
            }
          }}
        >
          <TabsList className="mb-4 flex w-full gap-1 overflow-x-auto hide-scrollbar h-auto p-1">
            <TabsTrigger value="morning" className="shrink-0 min-w-[88px] text-xs sm:text-sm">
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              الصباح
            </TabsTrigger>
            <TabsTrigger value="evening" className="shrink-0 min-w-[88px] text-xs sm:text-sm">
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              المساء
            </TabsTrigger>
            <TabsTrigger value="afterPrayer" className="shrink-0 min-w-[104px] text-xs sm:text-sm">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              بعد الصلاة
            </TabsTrigger>
            <TabsTrigger value="sleep" className="shrink-0 min-w-[88px] text-xs sm:text-sm">
              <MoonIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              النوم
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <CardHeader className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                      <currentCategory.icon className="w-5 h-5 text-emerald-600" />
                      {currentCategory.title}
                    </CardTitle>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {currentCategory.subtitle}
                    </p>
                    <div className={`inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-amber-50 text-amber-700'}`}>
                      <Clock3 className="w-3.5 h-3.5" />
                      الوقت المناسب: {currentCategory.bestTime}
                    </div>
                  </div>

                  <div className="space-y-2 sm:text-left">
                    <Badge className="bg-emerald-600 text-white">
                      {currentProgress.completed}/{currentProgress.total}
                    </Badge>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {currentCategory.guidance}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>تقدم الفئة الحالية</span>
                    <span>{Math.round(currentProgress.percentage)}%</span>
                  </div>
                  <Progress value={currentProgress.percentage} className="h-2.5" />
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="ابحث داخل نص الذكر..."
                      className="pl-10"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['all', 'الكل'],
                      ['remaining', 'المتبقي'],
                      ['completed', 'المكتمل']
                    ] as Array<[AzkarViewMode, string]>).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setViewMode(mode)}
                        className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                          viewMode === mode
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
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
              </CardHeader>

              <CardContent className="pt-0">
                <ScrollArea className="h-[58vh] sm:h-[62vh]">
                  <div className="space-y-3 pb-2">
                    {filteredAzkar.map((item) => {
                      const showDots = item.zikr.count <= 12;
                      const canAddFive = item.zikr.count >= 10 && !item.isCompleted;

                      return (
                        <div
                          key={item.key}
                          className={`rounded-2xl border p-4 transition-all ${
                            item.isCompleted
                              ? darkMode
                                ? 'border-emerald-600 bg-emerald-900/15'
                                : 'border-emerald-300 bg-emerald-50'
                              : darkMode
                                ? 'border-slate-700 bg-slate-900/40'
                                : 'border-emerald-100 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${item.isCompleted ? 'bg-emerald-600 text-white' : darkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-700 border border-emerald-100'}`}>
                                {item.index + 1}
                              </div>
                              <Badge variant="outline">المطلوب: {item.zikr.count}</Badge>
                            </div>

                            <Badge className={item.isCompleted ? 'bg-emerald-600 text-white' : ''} variant={item.isCompleted ? 'default' : 'secondary'}>
                              {item.isCompleted ? 'مكتمل' : `المتبقي ${item.remaining}`}
                            </Badge>
                          </div>

                          <p className="mt-3 text-base sm:text-lg leading-relaxed font-arabic">
                            {item.zikr.text}
                          </p>

                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span>{item.completed}/{item.zikr.count}</span>
                              <span>{Math.round(item.percentage)}%</span>
                            </div>
                            <Progress value={item.percentage} className="h-2" />
                            {showDots && (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {Array.from({ length: item.zikr.count }, (_, dotIndex) => (
                                  <div
                                    key={dotIndex}
                                    className={`w-2 h-2 rounded-full ${
                                      dotIndex < item.completed
                                        ? 'bg-emerald-500'
                                        : darkMode
                                          ? 'bg-slate-600'
                                          : 'bg-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => incrementZikr(activeTab, item.index, item.zikr.count, 1)} disabled={item.isCompleted}>
                              <Plus className="w-4 h-4 ml-1" />
                              +1
                            </Button>

                            {canAddFive && (
                              <Button size="sm" variant="outline" onClick={() => incrementZikr(activeTab, item.index, item.zikr.count, 5)}>
                                <Plus className="w-4 h-4 ml-1" />
                                +5
                              </Button>
                            )}

                            <Button size="sm" variant="outline" onClick={() => decrementZikr(activeTab, item.index, item.zikr.count, 1)} disabled={item.completed === 0}>
                              <Minus className="w-4 h-4 ml-1" />
                              -1
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => completeZikr(activeTab, item.index, item.zikr.count)} disabled={item.isCompleted}>
                              <Check className="w-4 h-4 ml-1" />
                              إكمال
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => handleCopyZikr(item.key, item.zikr.text)}>
                              {copiedKey === item.key ? <CheckCheck className="w-4 h-4 ml-1 text-emerald-600" /> : <Copy className="w-4 h-4 ml-1" />}
                              {copiedKey === item.key ? 'تم النسخ' : 'نسخ'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {filteredAzkar.length === 0 && (
                      <div className={`rounded-xl border p-6 text-center text-sm ${darkMode ? 'border-slate-700 text-slate-400' : 'border-emerald-100 text-slate-500'}`}>
                        لا توجد أذكار مطابقة للفلاتر الحالية.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'}`}>
          <CardContent className="p-5 sm:p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              إرشادات عملية للاستمرار
            </h3>
            <ul className={`space-y-2.5 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                <span>ابدأ بالأذكار التي عددها قليل ثم انتقل تدريجيًا إلى الأذكار ذات العدد الكبير.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                <span>استخدم فلتر "المتبقي" لمعرفة ما تبقى عليك بسرعة بدل التنقل بين كل البطاقات.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                <span>لو الذكر طويل، انسخه وراجعه بتركيز ثم ارجع للعداد حتى لا تنقطع السلسلة.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                <span>المداومة اليومية أهم من الكثرة المتقطعة؛ ثبّت وقتًا محددًا لكل فئة.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
