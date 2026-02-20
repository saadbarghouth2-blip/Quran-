import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type AppLogoSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AppLogoProps extends HTMLAttributes<HTMLDivElement> {
  size?: AppLogoSize;
  priority?: boolean;
  imageClassName?: string;
}

const sizeClasses: Record<AppLogoSize, string> = {
  sm: 'w-10 h-10 rounded-xl',
  md: 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl',
  lg: 'w-14 h-14 rounded-2xl',
  xl: 'w-20 h-20 sm:w-24 sm:h-24 rounded-[1.75rem]',
  '2xl': 'w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem]'
};

export default function AppLogo({
  size = 'md',
  priority = false,
  className,
  imageClassName,
  ...props
}: AppLogoProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden border border-emerald-200/70 bg-white shadow-lg shrink-0',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <img
        src="/logooo.png"
        alt="شعار المصحف"
        loading={priority ? 'eager' : 'lazy'}
        className={cn('w-full h-full object-cover', imageClassName)}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-emerald-500/10 via-transparent to-amber-400/10" />
    </div>
  );
}
