
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
  },
  [ThemeId.NebulaGold]: {
    id: ThemeId.NebulaGold,
    name: 'Nebula Gold',
    bgGradient: 'from-amber-950 via-slate-900 to-amber-950',
    accentColor: 'amber-500',
    cardBg: 'bg-amber-950/20',
    textColor: 'text-amber-50',
    borderColor: 'border-amber-500/30',
    unlockLevel: 5
  },
  [ThemeId.CyberGrid]: {
    id: ThemeId.CyberGrid,
    name: 'Cyber Grid',
    bgGradient: 'from-cyan-950 via-slate-950 to-cyan-950',
    accentColor: 'cyan-400',
    cardBg: 'bg-cyan-950/20',
    textColor: 'text-cyan-50',
    borderColor: 'border-cyan-400/30',
    unlockLevel: 10
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
  lastVisit: new Date().toISOString(),
  badges: [],
  unlockedThemes: [ThemeId.DeepSpace, ThemeId.CrimsonFlash, ThemeId.EmeraldLight]
};
