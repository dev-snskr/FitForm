'use client';

// FitForm Onboarding Page (/onboarding)
// Upgraded with:
// - Floating ThemeToggle (since Navbar is hidden on this page).
// - Framer Motion scroll-reveal and staggered entrance animations.
// - High-contrast Light and Dark mode styling with glassy aesthetics.

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dumbbell,
  Flame,
  Activity,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { validateUserProfile } from '@/lib/validation';
import { setStoredActiveUserId } from '@/lib/profileStorage';
import ThemeToggle from '@/components/ThemeToggle';

export default function OnboardingPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male',
    heightCm: '',
    weightKg: '',
    goal: 'muscle_gain',
    experience: 'beginner',
    daysPerWeek: 4,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const payload = {
      name: formData.name,
      age: Number(formData.age),
      gender: formData.gender,
      heightCm: Number(formData.heightCm),
      weightKg: Number(formData.weightKg),
      goal: formData.goal,
      experience: formData.experience,
      daysPerWeek: Number(formData.daysPerWeek),
    };

    const validation = validateUserProfile(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setServerError(data.error || 'Failed to create profile. Please check your data.');
        }
        setIsSubmitting(false);
        return;
      }

      if (data.user?.id) {
        setStoredActiveUserId(data.user.id);
      }

      router.push('/plan');
    } catch (err) {
      console.error('Onboarding submission error:', err);
      setServerError('A network error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative">
      {/* Floating Theme Toggle on Onboarding Page */}
      <ThemeToggle variant="floating" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-2xl"
      >
        {/* Header Branding */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-xl shadow-indigo-500/25 mb-4">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 dark:from-indigo-400 dark:via-cyan-400 dark:to-indigo-200 bg-clip-text text-transparent">
              FitForm
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Tell us about your body and fitness goals to generate your personalized 30-day program.
          </p>
        </motion.div>

        {/* Glassmorphic Form Card */}
        <motion.div
          variants={itemVariants}
          className="glass-panel rounded-2xl p-6 sm:p-10 relative overflow-hidden"
        >
          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-600 dark:text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <motion.div variants={itemVariants}>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Full Name or Nickname
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Alex Johnson"
                className={`w-full px-4 py-2.5 rounded-xl placeholder-slate-400 dark:placeholder-slate-500 glass-input ${
                  errors.name ? 'border-red-500 focus:border-red-500' : ''
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  {errors.name}
                </p>
              )}
            </motion.div>

            {/* Age & Gender */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="age" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Age <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(13 - 80)</span>
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="24"
                  min="13"
                  max="80"
                  className={`w-full px-4 py-2.5 rounded-xl placeholder-slate-400 dark:placeholder-slate-500 glass-input ${
                    errors.age ? 'border-red-500' : ''
                  }`}
                />
                {errors.age && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    {errors.age}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Gender
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['male', 'female', 'other'].map((g) => (
                    <motion.button
                      key={g}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFormData((prev) => ({ ...prev, gender: g }))}
                      className={`py-2.5 text-xs font-semibold rounded-xl capitalize transition-all border ${
                        formData.gender === g
                          ? 'bg-indigo-50 dark:bg-indigo-600/30 border-indigo-500 text-indigo-700 dark:text-indigo-200 shadow-md shadow-indigo-600/10'
                          : 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5'
                      }`}
                    >
                      {g}
                    </motion.button>
                  ))}
                </div>
                {errors.gender && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.gender}</p>
                )}
              </div>
            </motion.div>

            {/* Height & Weight */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="heightCm" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Height <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(100 - 230 cm)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="heightCm"
                    name="heightCm"
                    value={formData.heightCm}
                    onChange={handleChange}
                    placeholder="175"
                    step="0.1"
                    className={`w-full px-4 py-2.5 rounded-xl placeholder-slate-400 dark:placeholder-slate-500 glass-input ${
                      errors.heightCm ? 'border-red-500' : ''
                    }`}
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    cm
                  </span>
                </div>
                {errors.heightCm && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    {errors.heightCm}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="weightKg" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Weight <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(30 - 250 kg)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="weightKg"
                    name="weightKg"
                    value={formData.weightKg}
                    onChange={handleChange}
                    placeholder="70"
                    step="0.1"
                    className={`w-full px-4 py-2.5 rounded-xl placeholder-slate-400 dark:placeholder-slate-500 glass-input ${
                      errors.weightKg ? 'border-red-500' : ''
                    }`}
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    kg
                  </span>
                </div>
                {errors.weightKg && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    {errors.weightKg}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Primary Fitness Goal */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Primary Fitness Goal
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'fat_loss',
                    label: 'Fat Loss',
                    desc: 'Circuit style, high reps, 30s rest',
                    icon: Flame,
                    color: 'text-amber-500 dark:text-amber-400',
                  },
                  {
                    id: 'muscle_gain',
                    label: 'Muscle Gain',
                    desc: 'Strength style, lower reps, 150s rest',
                    icon: Dumbbell,
                    color: 'text-indigo-600 dark:text-indigo-400',
                  },
                  {
                    id: 'maintain',
                    label: 'Maintain',
                    desc: 'Balanced volume, 60s rest',
                    icon: Activity,
                    color: 'text-emerald-600 dark:text-emerald-400',
                  },
                ].map(({ id, label, desc, icon: Icon, color }) => (
                  <motion.button
                    key={id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ y: shouldReduceMotion ? 0 : -2 }}
                    onClick={() => setFormData((prev) => ({ ...prev, goal: id }))}
                    className={`p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                      formData.goal === id
                        ? 'bg-indigo-50 dark:bg-indigo-600/25 border-indigo-500 shadow-md shadow-indigo-600/15'
                        : 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-200/60 dark:hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
              {errors.goal && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.goal}</p>
              )}
            </motion.div>

            {/* Experience Level */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Fitness Experience
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'beginner', label: 'Beginner', desc: '0 - 6 months' },
                  { id: 'intermediate', label: 'Intermediate', desc: '6 - 24 months' },
                  { id: 'advanced', label: 'Advanced', desc: '2+ years' },
                ].map(({ id, label, desc }) => (
                  <motion.button
                    key={id}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ y: shouldReduceMotion ? 0 : -2 }}
                    onClick={() => setFormData((prev) => ({ ...prev, experience: id }))}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      formData.experience === id
                        ? 'bg-indigo-50 dark:bg-indigo-600/25 border-indigo-500 text-slate-900 dark:text-white shadow-md shadow-indigo-600/15 font-semibold'
                        : 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-200/60 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="text-xs font-semibold">{label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>
                  </motion.button>
                ))}
              </div>
              {errors.experience && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.experience}</p>
              )}
            </motion.div>

            {/* Workout Days Per Week */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Workout Frequency (Days / Week)
                </label>
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                  {formData.daysPerWeek} Days / Week
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[3, 4, 5, 6].map((days) => (
                  <motion.button
                    key={days}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFormData((prev) => ({ ...prev, daysPerWeek: days }))}
                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      formData.daysPerWeek === days
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25'
                        : 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5'
                    }`}
                  >
                    {days} Days
                  </motion.button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                Rest days are strategically scheduled; every 7th day is active recovery.
              </p>
              {errors.daysPerWeek && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.daysPerWeek}</p>
              )}
            </motion.div>

            {/* Submit Button */}
            <motion.div variants={itemVariants} className="pt-2">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: shouldReduceMotion ? 1 : 1.01 }}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-xl shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 text-base cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Building Your 30-Day Plan...</span>
                  </>
                ) : (
                  <>
                    <span>Generate My 30-Day Plan</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
