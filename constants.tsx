
import { ThemeId, ThemeConfig } from './types';

export const THEMES: Record<ThemeId, ThemeConfig> = {
  [ThemeId.DeepSpace]: {
    id: ThemeId.DeepSpace,
    name: 'Deep Space',
    bgGradient: 'from-slate-900 via-indigo-950 to-slate-900',
    accentColor: 'indigo-500',
    cardBg: 'bg-slate-900/40',
    textColor: 'text-indigo-50',
    borderColor: 'border-indigo-500/30'
  },
  [ThemeId.CrimsonFlash]: {
    id: ThemeId.CrimsonFlash,
    name: 'Crimson Flash',
    bgGradient: 'from-zinc-900 via-rose-950 to-zinc-900',
    accentColor: 'rose-500',
    cardBg: 'bg-rose-950/20',
    textColor: 'text-rose-50',
    borderColor: 'border-rose-500/30'
  },
  [ThemeId.EmeraldLight]: {
    id: ThemeId.EmeraldLight,
    name: 'Emerald Light',
    bgGradient: 'from-stone-900 via-teal-950 to-stone-900',
    accentColor: 'teal-500',
    cardBg: 'bg-teal-950/20',
    textColor: 'text-teal-50',
    borderColor: 'border-teal-500/30'
  }
};

export const INITIAL_USER: any = {
  name: 'Scholar',
  avatar: 'https://picsum.photos/seed/scholar/200',
  streak: 1,
  accuracy: 0,
  completedTests: 0,
  avgScore: 0,
  xp: 0,
  level: 1,
  lastVisit: new Date().toISOString()
};
