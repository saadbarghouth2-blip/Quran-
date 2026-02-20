// بيانات خطط التحفيظ والمراجعة

export interface MemorizationPlan {
  id: string;
  name: string;
  description: string;
  type: 'full' | 'juz' | 'surah' | 'custom';
  targetAmount: number;
  durationDays: number;
  dailyAmount: number;
  icon: string;
  color: string;
}

export const memorizationPlans: MemorizationPlan[] = [
  {
    id: 'khatma-1year',
    name: 'ختمة في سنة',
    description: 'حفظ القرآن كاملاً في سنة واحدة (5 آيات يومياً)',
    type: 'full',
    targetAmount: 6236,
    durationDays: 365,
    dailyAmount: 17,
    icon: '📖',
    color: '#10B981'
  },
  {
    id: 'khatma-6months',
    name: 'ختمة في 6 أشهر',
    description: 'حفظ القرآن كاملاً في 6 أشهر (35 آية يومياً)',
    type: 'full',
    targetAmount: 6236,
    durationDays: 180,
    dailyAmount: 35,
    icon: '⚡',
    color: '#F59E0B'
  },
  {
    id: 'juz-30',
    name: 'حفظ الجزء 30',
    description: 'حفظ الجزء الثلاثين كاملاً (سورة قصيرة يومياً)',
    type: 'juz',
    targetAmount: 564,
    durationDays: 37,
    dailyAmount: 15,
    icon: '🌟',
    color: '#8B5CF6'
  },
  {
    id: 'juz-amma',
    name: 'حفظ الأجزاء القصيرة',
    description: 'حفظ الأجزاء من 28 إلى 30',
    type: 'juz',
    targetAmount: 1500,
    durationDays: 50,
    dailyAmount: 30,
    icon: '🎯',
    color: '#EC4899'
  },
  {
    id: 'surah-mulk',
    name: 'حفظ سورة الملك',
    description: 'حفظ سورة الملك (30 آية)',
    type: 'surah',
    targetAmount: 30,
    durationDays: 7,
    dailyAmount: 5,
    icon: '👑',
    color: '#14B8A6'
  },
  {
    id: 'surah-kahf',
    name: 'حفظ سورة الكهف',
    description: 'حفظ سورة الكهف (110 آيات)',
    type: 'surah',
    targetAmount: 110,
    durationDays: 14,
    dailyAmount: 8,
    icon: '🏔️',
    color: '#3B82F6'
  },
  {
    id: 'surah-yaseen',
    name: 'حفظ سورة يس',
    description: 'حفظ قلب القرآن (83 آية)',
    type: 'surah',
    targetAmount: 83,
    durationDays: 10,
    dailyAmount: 8,
    icon: '❤️',
    color: '#EF4444'
  },
  {
    id: 'custom',
    name: 'خطة مخصصة',
    description: 'حدد أنت كمية الحفظ اليومية',
    type: 'custom',
    targetAmount: 0,
    durationDays: 0,
    dailyAmount: 0,
    icon: '⚙️',
    color: '#6B7280'
  }
];

// أنماط المراجعة
export interface ReviewPattern {
  id: string;
  name: string;
  description: string;
  intervals: number[]; // عدد الدقائق بين كل مراجعة
  icon: string;
}

export const reviewPatterns: ReviewPattern[] = [
  {
    id: 'spaced',
    name: 'المراجعة المتباعدة',
    description: 'مراجعة بعد 10 دقائق، ساعة، يوم، 3 أيام، أسبوع',
    intervals: [10, 60, 1440, 4320, 10080],
    icon: '📚'
  },
  {
    id: 'intensive',
    name: 'مراجعة مكثفة',
    description: 'مراجعة كل 5 دقائق لمدة ساعة',
    intervals: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    icon: '🔥'
  },
  {
    id: 'daily',
    name: 'مراجعة يومية',
    description: 'مراجعة مرة واحدة يومياً',
    intervals: [1440],
    icon: '📅'
  },
  {
    id: 'before-sleep',
    name: 'قبل النوم',
    description: 'مراجعة مرة واحدة قبل النوم',
    intervals: [1],
    icon: '🌙'
  }
];

// نصائح التحفيظ
export const memorizationTips = [
  {
    id: 1,
    title: 'استمع للآية 10 مرات',
    description: 'استمع للآية من القارئ المفضل قبل محاولة الحفظ',
    icon: '🎧'
  },
  {
    id: 2,
    title: 'اقرأ بصوت مسموع',
    description: 'قراءة الآية بصوت مسموع تساعد على التثبيت',
    icon: '🗣️'
  },
  {
    id: 3,
    title: 'افهم المعنى',
    description: 'اقرأ التفسير البسيط للآية قبل حفظها',
    icon: '💡'
  },
  {
    id: 4,
    title: 'راجع فوراً',
    description: 'راجع الآية مباشرة بعد حفظها',
    icon: '🔄'
  },
  {
    id: 5,
    title: 'اكتب الآية',
    description: 'كتابة الآية تساعد على التذكر',
    icon: '✍️'
  },
  {
    id: 6,
    title: 'صلِّ بالآية',
    description: 'صلِّ بالآية التي حفظتها في الصلوات',
    icon: '🤲'
  }
];

// اختبارات التحفيظ
export interface MemorizationTest {
  id: string;
  surahNumber: number;
  startVerse: number;
  endVerse: number;
  type: 'fill-blank' | 'order-verses' | 'audio-recog';
}

// جدول المراجعة الأسبوعي
export interface WeeklyReview {
  day: string;
  surahs: number[];
  color: string;
}

export const weeklyReviewSchedule: WeeklyReview[] = [
  { day: 'السبت', surahs: [1, 2, 3], color: '#10B981' },
  { day: 'الأحد', surahs: [4, 5, 6], color: '#3B82F6' },
  { day: 'الاثنين', surahs: [7, 8, 9], color: '#8B5CF6' },
  { day: 'الثلاثاء', surahs: [10, 11, 12], color: '#EC4899' },
  { day: 'الأربعاء', surahs: [13, 14, 15], color: '#F59E0B' },
  { day: 'الخميس', surahs: [16, 17, 18], color: '#EF4444' },
  { day: 'الجمعة', surahs: [19, 20, 21], color: '#14B8A6' }
];

// أذكار بعد الحفظ
export const postMemorizationDuas = [
  {
    text: 'اللهم اجعل القرآن ربيع قلبي ونور صدري وجلاء حزني وذهاب همي',
    source: 'النسائي'
  },
  {
    text: 'اللهم ذكرني منه ما نسيت وعلمني منه ما جهلت وارزقني تلاوته آناء الليل وأطراف النهار',
    source: 'دعاء'
  },
  {
    text: 'اللهم اجعلني من أهل القرآن الذين هم أهلك وخاصتك',
    source: 'النسائي'
  }
];
