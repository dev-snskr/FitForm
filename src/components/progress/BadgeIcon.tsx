'use client';

// src/components/progress/BadgeIcon.tsx
// Renders clean, resolution-independent metallic glass badge icons
// No external image downloads; uses Lucide icons with multi-layered metallic SVG accents.

import React from 'react';
import {
  Dumbbell,
  Flame,
  Zap,
  ShieldAlert,
  CalendarCheck,
  Flag,
  Trophy,
  Sparkles,
  Award,
  Layers,
  Shield,
  Timer,
  Utensils,
  RotateCcw,
} from 'lucide-react';

interface BadgeIconProps {
  iconKey: string;
  isUnlocked: boolean;
  className?: string;
  gradient?: string;
}

export default function BadgeIcon({
  iconKey,
  isUnlocked,
  className = 'w-6 h-6',
  gradient = 'from-indigo-500 to-cyan-500',
}: BadgeIconProps) {
  const getIcon = () => {
    switch (iconKey) {
      case 'Dumbbell':
        return Dumbbell;
      case 'Flame':
        return Flame;
      case 'Zap':
        return Zap;
      case 'ShieldAlert':
        return ShieldAlert;
      case 'CalendarCheck':
        return CalendarCheck;
      case 'Flag':
        return Flag;
      case 'Trophy':
        return Trophy;
      case 'Sparkles':
        return Sparkles;
      case 'Award':
        return Award;
      case 'Layers':
        return Layers;
      case 'Shield':
        return Shield;
      case 'Timer':
        return Timer;
      case 'Utensils':
        return Utensils;
      case 'RotateCcw':
        return RotateCcw;
      default:
        return Trophy;
    }
  };

  const IconComponent = getIcon();

  if (!isUnlocked) {
    return (
      <div className="relative w-12 h-12 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300/40 dark:border-white/5 flex items-center justify-center grayscale opacity-50 shadow-inner">
        <IconComponent className="w-6 h-6 text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  return (
    <div
      className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center overflow-hidden group`}
    >
      {/* Metallic glass reflection sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/10 pointer-events-none" />

      {/* Center icon container */}
      <div className="w-full h-full rounded-[14px] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center">
        <IconComponent className={`${className} text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] transform transition-transform group-hover:scale-110`} />
      </div>
    </div>
  );
}
