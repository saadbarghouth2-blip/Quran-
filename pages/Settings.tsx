import { useEffect, useState } from 'react';
import { useQuran } from '@/context/QuranContext';
import { reciters } from '@/data/quran';
import {
  Moon,
  Sun,
  Volume2,
  Type,
  Languages,
  Bell,
  Shield,
  CircleHelp,
  Palette,
  BookOpen,
  Crown,
  Edit3,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLogo from '@/components/app-logo';
import PageInfoPanel from '@/components/page-info-panel';

const LOCAL_PROFILE_NAME_KEY = 'quranLocalProfileName';
const LOCAL_NOTIFICATIONS_KEY = 'quranLocalNotifications';
const LOCAL_AUTOPLAY_KEY = 'quranLocalAutoPlay';

function readLocalProfileName(): string {
  if (typeof window === 'undefined') {
    return 'مستخدم محلي';
  }

  try {
    const stored = window.localStorage.getItem(LOCAL_PROFILE_NAME_KEY)?.trim();
    return stored || 'مستخدم محلي';
  } catch {
    return 'مستخدم محلي';
  }
}

function writeLocalProfileName(value: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (value.trim()) {
      window.localStorage.setItem(LOCAL_PROFILE_NAME_KEY, value.trim());
    }
  } catch {
    // Ignore storage errors.
  }
}

function readLocalBoolean(key: string, fallbackValue: boolean): boolean {
  if (typeof window === 'undefined') {
    return fallbackValue;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) {
      return fallbackValue;
    }
    return rawValue === '1';
  } catch {
    return fallbackValue;
  }
}

function writeLocalBoolean(key: string, value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Ignore storage errors.
  }
}

export default function Settings() {
  const {
    userProgress,
    darkMode,
    toggleDarkMode,
    fontSize,
    setFontSize,
    showTranslation,
    toggleTranslation,
    selectedReciter,
    setSelectedReciter
  } = useQuran();

  const [userName, setUserName] = useState(readLocalProfileName);
  const [notifications, setNotifications] = useState(() => readLocalBoolean(LOCAL_NOTIFICATIONS_KEY, true));
  const [autoPlay, setAutoPlay] = useState(() => readLocalBoolean(LOCAL_AUTOPLAY_KEY, false));
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const totalPagesEstimate = Math.round(userProgress.totalRead / 10);
  const readingHoursEstimate = Number((userProgress.totalRead / 100).toFixed(1));
  const settingsInfoStats = [
    { label: 'وضع البيانات', value: 'محلي فقط' },
    { label: 'آيات مقروءة', value: userProgress.totalRead },
    { label: 'حجم الخط', value: `${fontSize}px` },
    { label: 'القارئ', value: reciters.find((item) => item.id === selectedReciter)?.nameArabic || 'غير محدد' }
  ];

  useEffect(() => {
    writeLocalBoolean(LOCAL_NOTIFICATIONS_KEY, notifications);
  }, [notifications]);

  useEffect(() => {
    writeLocalBoolean(LOCAL_AUTOPLAY_KEY, autoPlay);
  }, [autoPlay]);

  const handleSaveProfile = () => {
    setProfileError(null);
    setProfileSuccess(null);

    const cleanName = userName.trim();
    if (cleanName.length < 2) {
      setProfileError('يرجى إدخال اسم واضح.');
      return;
    }

    writeLocalProfileName(cleanName);
    setUserName(cleanName);
    setProfileSuccess('تم حفظ الاسم محليًا على هذا الجهاز.');
    setShowEditProfile(false);
  };

  return (
    <div className={`app-page-shell transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-white' : 'bg-gradient-to-br from-emerald-50 to-cyan-50 text-slate-800'}`}>
      <header className={`sticky top-0 z-[55] border-b backdrop-blur-xl shadow-sm ${darkMode ? 'bg-slate-900/78 border-slate-700' : 'bg-white/78 border-emerald-100'}`}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppLogo size="md" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-600 to-slate-700 bg-clip-text text-transparent">
                  الإعدادات
                </h1>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>تخصيص التطبيق محليًا</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-page-main max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <PageInfoPanel
          darkMode={darkMode}
          accent="sky"
          className="mb-6"
          title="إعدادات بسيطة وسريعة"
          description="كل شيء هنا محلي على جهازك، بدون تسجيل وبدون قاعدة بيانات."
          tips={[
            'عدّل الاسم المحلي ليظهر في الواجهة بشكل شخصي.',
            'اضبط الخط والقارئ المفضل مرة واحدة ثم ابدأ القراءة.',
            'بياناتك محفوظة محليًا في نفس المتصفح.'
          ]}
          stats={settingsInfoStats}
        />

        <Card className={`mb-6 overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-90" />
            <div className="relative p-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl sm:text-4xl">
                  👤
                </div>
                <div className="flex-1 text-white">
                  <h2 className="text-xl sm:text-2xl font-bold mb-1">{userName}</h2>
                  <p className="opacity-90 mb-1">{userProgress.title}</p>
                  <p className="inline-flex items-center gap-1 text-xs opacity-80 mb-3">
                    <HardDrive className="w-3 h-3" />
                    ملف محلي على الجهاز
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-white/20 backdrop-blur">
                      <Crown className="w-3 h-3 mr-1" />
                      المستوى {userProgress.level}
                    </Badge>
                    <Badge className="bg-white/20 backdrop-blur">{userProgress.points} نقطة</Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 self-end sm:self-auto"
                  onClick={() => setShowEditProfile(true)}
                >
                  <Edit3 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-emerald-50'}`}>
                <p className="text-2xl font-bold text-emerald-600">{userProgress.totalRead}</p>
                <p className="text-sm">آية مقروءة</p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-blue-50'}`}>
                <p className="text-2xl font-bold text-blue-600">{totalPagesEstimate}</p>
                <p className="text-sm">صفحة مقروءة</p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-purple-50'}`}>
                <p className="text-2xl font-bold text-purple-600">{readingHoursEstimate}</p>
                <p className="text-sm">ساعة قراءة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-500" />
              المظهر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <div>
                  <p className="font-semibold">الوضع الليلي</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>تفعيل المظهر الداكن</p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-3 mb-4">
                <Type className="w-5 h-5" />
                <div>
                  <p className="font-semibold">حجم الخط</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>تخصيص حجم خط القرآن</p>
                </div>
              </div>
              <Slider value={[fontSize]} onValueChange={(v) => setFontSize(v[0])} min={16} max={48} step={2} />
              <p className="text-center mt-2 text-sm text-slate-500">{fontSize}px</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Languages className="w-5 h-5" />
                <div>
                  <p className="font-semibold">الترجمة</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>إظهار ترجمة الآيات</p>
                </div>
              </div>
              <Switch checked={showTranslation} onCheckedChange={toggleTranslation} />
            </div>
          </CardContent>
        </Card>

        <Card className={`mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-blue-500" />
              الصوت
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block">القارئ المفضل</Label>
              <Select value={selectedReciter} onValueChange={setSelectedReciter}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر القارئ" />
                </SelectTrigger>
                <SelectContent>
                  {reciters.map((reciter) => (
                    <SelectItem key={reciter.id} value={reciter.id}>
                      {reciter.nameArabic} - {reciter.style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">التشغيل التلقائي</p>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  تشغيل الصوت تلقائيًا عند فتح السورة
                </p>
              </div>
              <Switch checked={autoPlay} onCheckedChange={setAutoPlay} />
            </div>
          </CardContent>
        </Card>

        <Card className={`mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              الإشعارات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">تذكير القراءة</p>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>تذكير يومي بقراءة القرآن</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </CardContent>
        </Card>

        <Card className={`mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              البيانات والخصوصية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              التطبيق يعمل محليًا فقط. لا يوجد تسجيل دخول ولا قاعدة بيانات. كل بياناتك محفوظة على نفس الجهاز.
            </p>
            {profileError && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{profileSuccess}</p>
            )}
          </CardContent>
        </Card>

        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleHelp className="w-5 h-5 text-blue-500" />
              حول التطبيق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-1">المصحف الذكي</h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4`}>Smart Quran App v1.0.0</p>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                تطبيق قراءة وتحفيظ قرآن سريع وبسيط بدون تسجيل حسابات.
              </p>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل الاسم المحلي</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الاسم</Label>
                <Input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="أدخل اسمك" />
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveProfile}>
                حفظ الاسم
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
