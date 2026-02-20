import { lazy, Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { QuranProvider } from '@/context/QuranContext';
import { useQuran } from '@/context/QuranContext';
import { getStoredValue, setStoredValue } from '@/lib/user-storage';
import {
  Home as HomeIcon,
  BookOpen,
  Brain,
  Sparkles,
  Trophy,
  Gamepad2,
  Settings as SettingsIcon
} from 'lucide-react';
import './App.css';

const Home = lazy(() => import('@/pages/Home'));
const Reader = lazy(() => import('@/pages/Reader'));
const Memorize = lazy(() => import('@/pages/Memorize'));
const Azkar = lazy(() => import('@/pages/Azkar'));
const Challenges = lazy(() => import('@/pages/Challenges'));
const Kids = lazy(() => import('@/pages/Kids'));
const Settings = lazy(() => import('@/pages/Settings'));

const LAST_ROUTE_STORAGE_KEY = 'quranLastVisitedRoute';
const SCROLL_STORAGE_PREFIX = 'quranScrollY:';
const APP_PATHS = new Set(['/', '/reader', '/memorize', '/azkar', '/challenges', '/kids', '/settings']);

function normalizeResumableRoute(rawRoute: string | null): string | null {
  if (!rawRoute) {
    return null;
  }

  let route = rawRoute.trim();
  if (!route) {
    return null;
  }

  if (route.startsWith('http://') || route.startsWith('https://')) {
    try {
      const parsed = new URL(route);
      route = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  }

  if (!route.startsWith('/')) {
    route = `/${route}`;
  }

  const [, pathname = '', suffix = ''] = route.match(/^([^?#]*)(.*)$/) || [];
  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  if (!APP_PATHS.has(normalizedPathname)) {
    return null;
  }

  return `${normalizedPathname}${suffix}`;
}

function SessionPersistence() {
  const location = useLocation();

  useEffect(() => {
    const route = normalizeResumableRoute(`${location.pathname}${location.search}${location.hash}`);
    if (route) {
      setStoredValue(LAST_ROUTE_STORAGE_KEY, route);
    }
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const scrollKey = `${SCROLL_STORAGE_PREFIX}${location.pathname}`;
    const savedScroll = getStoredValue(scrollKey);
    const parsedScroll = savedScroll ? Number.parseInt(savedScroll, 10) : Number.NaN;
    const safeScrollTop = Number.isFinite(parsedScroll) && parsedScroll >= 0 ? parsedScroll : 0;

    const animationFrameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: safeScrollTop, behavior: 'auto' });
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [location.pathname]);

  useEffect(() => {
    const scrollKey = `${SCROLL_STORAGE_PREFIX}${location.pathname}`;
    let timeoutId: number | null = null;

    const saveScrollPosition = () => {
      const scrollY = Math.max(0, Math.round(window.scrollY));
      setStoredValue(scrollKey, scrollY.toString());
    };

    const handleScroll = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(saveScrollPosition, 120);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      saveScrollPosition();
    };
  }, [location.pathname]);

  return null;
}

function HomeWithResume() {
  const resumeRoute = useMemo(() => normalizeResumableRoute(getStoredValue(LAST_ROUTE_STORAGE_KEY)), []);

  if (resumeRoute && resumeRoute !== '/') {
    return <Navigate to={resumeRoute} replace />;
  }

  return <Home />;
}

function Navigation() {
  const { darkMode } = useQuran();

  const navItems = useMemo(
    () => [
      { path: '/', icon: HomeIcon, label: 'الرئيسية', mobileLabel: 'رئيسية', end: true },
      { path: '/reader', icon: BookOpen, label: 'القراءة', mobileLabel: 'قراءة' },
      { path: '/memorize', icon: Brain, label: 'التحفيظ', mobileLabel: 'تحفيظ' },
      { path: '/azkar', icon: Sparkles, label: 'الأذكار', mobileLabel: 'أذكار' },
      { path: '/challenges', icon: Trophy, label: 'التحديات', mobileLabel: 'تحديات' },
      { path: '/kids', icon: Gamepad2, label: 'الأطفال', mobileLabel: 'أطفال' },
      { path: '/settings', icon: SettingsIcon, label: 'الإعدادات', mobileLabel: 'إعدادات' }
    ],
    []
  );

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 border-t ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-[#fff8eb] border-amber-200 shadow-[0_-8px_20px_rgba(127,93,22,0.08)]'} z-50`}
      style={{
        height: 'calc(var(--app-bottom-nav-height) + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="h-full max-w-7xl mx-auto px-1.5 sm:px-2 overflow-x-auto hide-scrollbar">
        <div className="h-full flex items-center gap-1 min-w-max sm:min-w-0 sm:grid sm:grid-cols-7 sm:gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `h-[calc(var(--app-bottom-nav-height)-8px)] min-w-[74px] sm:min-w-0 w-full flex flex-col items-center justify-center gap-1 rounded-xl px-2 transition-colors ${
                  isActive
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/25'
                    : darkMode
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              <span className="text-[10px] sm:text-xs leading-none whitespace-nowrap">
                <span className="sm:hidden">{item.mobileLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

function RouteLoading({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
          darkMode
            ? 'border-slate-700 bg-slate-800 text-slate-200'
            : 'border-emerald-100 bg-white text-slate-600'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        جاري تحميل الصفحة...
      </div>
    </div>
  );
}

function AppContent() {
  const { darkMode } = useQuran();

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-[100dvh] spiritual-page-bg overflow-x-hidden">
        <SessionPersistence />
        <Suspense fallback={<RouteLoading darkMode={darkMode} />}>
          <Routes>
            <Route path="/" element={<HomeWithResume />} />
            <Route path="/reader" element={<Reader />} />
            <Route path="/memorize" element={<Memorize />} />
            <Route path="/azkar" element={<Azkar />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/kids" element={<Kids />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Navigation />
      </div>
    </div>
  );
}

function App() {
  return (
    <QuranProvider>
      <Router>
        <AppContent />
      </Router>
    </QuranProvider>
  );
}

export default App;
