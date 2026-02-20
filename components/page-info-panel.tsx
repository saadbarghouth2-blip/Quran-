import { CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type AccentTone = 'emerald' | 'amber' | 'sky' | 'rose' | 'violet';

interface PageInfoStat {
  label: string;
  value: string | number;
}

interface PageInfoPanelProps {
  darkMode: boolean;
  title: string;
  description: string;
  tips?: string[];
  stats?: PageInfoStat[];
  accent?: AccentTone;
  className?: string;
}

const toneClasses: Record<
  AccentTone,
  {
    light: string;
    dark: string;
    badgeLight: string;
    badgeDark: string;
    icon: string;
  }
> = {
  emerald: {
    light: 'border-emerald-100 bg-emerald-50/75',
    dark: 'border-emerald-900/60 bg-slate-900/45',
    badgeLight: 'bg-emerald-100 text-emerald-700',
    badgeDark: 'bg-emerald-900/45 text-emerald-200',
    icon: 'text-emerald-500'
  },
  amber: {
    light: 'border-amber-200 bg-amber-50/75',
    dark: 'border-amber-900/50 bg-slate-900/45',
    badgeLight: 'bg-amber-100 text-amber-700',
    badgeDark: 'bg-amber-900/45 text-amber-200',
    icon: 'text-amber-500'
  },
  sky: {
    light: 'border-sky-200 bg-sky-50/75',
    dark: 'border-sky-900/50 bg-slate-900/45',
    badgeLight: 'bg-sky-100 text-sky-700',
    badgeDark: 'bg-sky-900/45 text-sky-200',
    icon: 'text-sky-500'
  },
  rose: {
    light: 'border-rose-200 bg-rose-50/75',
    dark: 'border-rose-900/50 bg-slate-900/45',
    badgeLight: 'bg-rose-100 text-rose-700',
    badgeDark: 'bg-rose-900/45 text-rose-200',
    icon: 'text-rose-500'
  },
  violet: {
    light: 'border-violet-200 bg-violet-50/75',
    dark: 'border-violet-900/50 bg-slate-900/45',
    badgeLight: 'bg-violet-100 text-violet-700',
    badgeDark: 'bg-violet-900/45 text-violet-200',
    icon: 'text-violet-500'
  }
};

export default function PageInfoPanel({
  darkMode,
  title,
  description,
  tips = [],
  stats = [],
  accent = 'emerald',
  className
}: PageInfoPanelProps) {
  const tone = toneClasses[accent];

  return (
    <Card
      className={cn(
        'overflow-hidden border',
        darkMode ? tone.dark : tone.light,
        className
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Info className={cn('w-4 h-4', tone.icon)} />
              {title}
            </h2>
            <p className={cn('mt-1 text-sm leading-6', darkMode ? 'text-slate-300' : 'text-slate-600')}>
              {description}
            </p>
          </div>
          <Badge className={darkMode ? tone.badgeDark : tone.badgeLight}>معلومات</Badge>
        </div>

        {tips.length > 0 && (
          <div className="mt-3 space-y-2">
            {tips.map((tip) => (
              <div
                key={tip}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm flex items-start gap-2',
                  darkMode ? 'border-slate-700 bg-slate-900/55 text-slate-200' : 'border-white/70 bg-white/90 text-slate-700'
                )}
              >
                <CheckCircle2 className={cn('w-4 h-4 mt-0.5 shrink-0', tone.icon)} />
                <p className="leading-6">{tip}</p>
              </div>
            ))}
          </div>
        )}

        {stats.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-center',
                  darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-white/80 bg-white/90'
                )}
              >
                <p className="text-sm sm:text-base font-bold truncate">{stat.value}</p>
                <p className={cn('text-[11px] mt-0.5 truncate', darkMode ? 'text-slate-400' : 'text-slate-500')}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
