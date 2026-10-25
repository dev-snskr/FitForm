'use client';

// src/components/progress/BadgeUnlockModal.tsx
// Celebratory Glass Popup Modal for Newly Earned Badges
// Triggers once per badge with metallic glass graphics, glow and confetti animations.
// Fully respects prefers-reduced-motion.

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, X, Check } from 'lucide-react';
import BadgeIcon from './BadgeIcon';

export interface UnlockedBadgeInfo {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  gradient: string;
}

interface BadgeUnlockModalProps {
  badge: UnlockedBadgeInfo | null;
  onClose: () => void;
}

export default function BadgeUnlockModal({ badge, onClose }: BadgeUnlockModalProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!badge) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 20 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm glass-panel rounded-3xl p-6 sm:p-8 border border-amber-400/30 dark:border-amber-400/20 shadow-2xl overflow-hidden text-center bg-white/90 dark:bg-slate-900/95"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Celebration Tag */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Badge Unlocked!</span>
          </div>

          {/* Central Animated Badge Icon */}
          <div className="flex justify-center mb-5">
            <motion.div
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      rotate: [0, -5, 5, 0],
                      scale: [1, 1.05, 1],
                    }
              }
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="p-3 rounded-3xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 shadow-xl"
            >
              <BadgeIcon
                iconKey={badge.iconKey}
                isUnlocked={true}
                gradient={badge.gradient}
                className="w-10 h-10"
              />
            </motion.div>
          </div>

          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            {badge.name}
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            {badge.description}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition cursor-pointer active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>Awesome! Keep Going</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
