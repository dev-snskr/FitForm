'use client';

// FitForm Landing / Root Gateway Route
// Checks profile existence and routes returning users to /plan or new users to /onboarding.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredActiveUserId, setStoredActiveUserId } from '@/lib/profileStorage';
import { Dumbbell } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function determineRoute() {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) {
          router.replace('/onboarding');
          return;
        }

        const data = await res.json();
        const users = data.users || [];

        if (users.length === 0) {
          // No profiles created yet -> Onboarding
          router.replace('/onboarding');
          return;
        }

        // Check if browser has a valid stored user id
        const storedId = getStoredActiveUserId();
        const existingUser = storedId ? users.find((u: { id: number }) => u.id === storedId) : null;

        if (existingUser) {
          router.replace('/plan');
        } else {
          // Fall back to most recent user
          setStoredActiveUserId(users[0].id);
          router.replace('/plan');
        }
      } catch (err) {
        console.error('Failed to resolve landing route:', err);
        router.replace('/onboarding');
      }
    }

    determineRoute();
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center mb-4 animate-pulse">
        <Dumbbell className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Loading FitForm...</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">Checking your workout profile</p>
    </div>
  );
}
