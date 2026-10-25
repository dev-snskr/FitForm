'use client';

// FitForm Theme Toggle Button
// Allows switching between Dark and Light modes with smooth micro-animations.
// Mounted check ensures no server/client hydration mismatch or flash of wrong theme.

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThemeToggleProps {
  variant?: 'navbar' | 'floating';
}

export default function ThemeToggle({ variant = 'navbar' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  // Avoid hydration mismatch by rendering a placeholder until mounted
  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 ${
          variant === 'floating'
            ? 'fixed top-5 right-5 z-50 shadow-lg backdrop-blur-xl'
            : ''
        }`}
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  if (variant === 'floating') {
    return (
      <motion.button
        type="button"
        onClick={toggleTheme}
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        aria-label="Toggle theme"
        className="fixed top-5 right-5 z-50 p-2.5 rounded-xl glass-panel text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-xl backdrop-blur-xl transition-colors cursor-pointer"
      >
        <motion.div
          key={isDark ? 'moon' : 'sun'}
          initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600" />
          )}
        </motion.div>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.05 }}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      aria-label="Toggle theme"
      className="p-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors cursor-pointer"
    >
      <motion.div
        key={isDark ? 'moon' : 'sun'}
        initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600" />
        )}
      </motion.div>
    </motion.button>
  );
}
