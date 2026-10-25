'use client';

// src/components/progress/BadgeWall.tsx
// Displays the 14-badge achievement wall:
// - Unlocked badges shown in full metallic gradient color with their stable unlock date
// - Locked badges greyed out with live percentage progress bar ("63 of 100 squat reps")

import React, { useState } from 'react';
import { Award, Lock, Sparkles, Filter } from 'lucide-react';
import BadgeIcon from './BadgeIcon';

export interface EvaluatedBadge {
  id: string;
  name: string;
  description: string;
  category: 'streak' | 'milestone' | 'form' | 'strength' | 'nutrition';
  iconKey: string;
  gradient: string;
  isUnlocked: boolean;
  earnedAt: string | null;
  currentValue: number;
  targetValue: number;
  unit: string;
  displayText: string;
}

interface BadgeWallProps {
  badges: EvaluatedBadge[];
}

export default function BadgeWall({ badges }: BadgeWallProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Badges' },
    { id: 'streak', label: 'Streaks' },
    { id: 'milestone', label: 'Milestones' },
    { id: 'form', label: 'Form Mastery' },
    { id: 'strength', label: 'Strength' },
    { id: 'nutrition', label: 'Nutrition' },
  ];

  const filteredBadges =
    selectedCategory === 'all'
      ? badges
      : badges.filter((b) => b.category === selectedCategory);

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border shadow-xl space-y-6">
      {/* Header & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Achievement Wall
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Unlocked {unlockedCount} of {badges.length} milestone badges
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBadges.map((badge) => {
          const progressPercent = Math.min(
            100,
            Math.round((badge.currentValue / Math.max(1, badge.targetValue)) * 100)
          );

          return (
            <div
              key={badge.id}
              className={`p-4 rounded-2xl border transition-all ${
                badge.isUnlocked
                  ? 'glass-card bg-white/70 dark:bg-slate-900/60 border-indigo-500/20 shadow-md hover:shadow-indigo-500/10 hover:border-indigo-500/40'
                  : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-white/5 opacity-80'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <BadgeIcon
                  iconKey={badge.iconKey}
                  isUnlocked={badge.isUnlocked}
                  gradient={badge.gradient}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {badge.name}
                    </h3>
                    {badge.isUnlocked ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Earned</span>
                      </span>
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {badge.description}
                  </p>

                  {/* Date unlocked or progress bar */}
                  <div className="mt-3">
                    {badge.isUnlocked && badge.earnedAt ? (
                      <div className="text-[10px] text-slate-400">
                        Earned on {new Date(badge.earnedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          <span>{badge.displayText}</span>
                          <span>{progressPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
