'use client';

// FitForm Main Navigation Bar
// Appears on all pages except /onboarding.
// Displays active route, profile selector, and "+ New Profile" button.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Dumbbell,
  Utensils,
  ClipboardList,
  User,
  PlusCircle,
  ChevronDown,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { getStoredActiveUserId, setStoredActiveUserId } from '@/lib/profileStorage';

interface UserSummary {
  id: number;
  name: string;
  goal: string;
  experience: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [activeUser, setActiveUser] = useState<UserSummary | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load users and current active profile
  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        const userList: UserSummary[] = data.users || [];
        setUsers(userList);

        const currentId = getStoredActiveUserId();
        if (currentId) {
          const matched = userList.find((u) => u.id === currentId);
          if (matched) {
            setActiveUser(matched);
            return;
          }
        }
        // If currentId is not found or null, pick first user if available
        if (userList.length > 0) {
          setActiveUser(userList[0]);
          setStoredActiveUserId(userList[0].id);
        }
      }
    } catch (err) {
      console.error('Navbar profile fetch error:', err);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [pathname]);

  // Hide Navbar completely on onboarding page
  if (pathname === '/onboarding') {
    return null;
  }

  const handleSelectUser = (user: UserSummary) => {
    setActiveUser(user);
    setStoredActiveUserId(user.id);
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    // Reload plan or relevant page with selected user
    router.push('/plan');
  };

  const handleCreateNewProfile = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/onboarding');
  };

  const navLinks = [
    { label: 'Workout', href: '/plan', icon: Dumbbell },
    { label: 'Diet', href: '/diet', icon: Utensils },
    { label: 'Logs', href: '/logs', icon: ClipboardList },
  ];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-slate-950/70 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link href="/plan" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                FitForm
              </span>
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <Sparkles className="w-2.5 h-2.5 mr-1 text-indigo-400" />
                AI GYM
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href || (href === '/plan' && pathname.startsWith('/plan'));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Profile Switcher & Actions */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-indigo-500/40 text-slate-200 text-sm transition-all focus:outline-none"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold leading-none text-slate-200">
                    {activeUser ? activeUser.name : 'Select Profile'}
                  </div>
                  {activeUser && (
                    <div className="text-[10px] text-slate-400 capitalize mt-0.5">
                      {activeUser.goal.replace('_', ' ')}
                    </div>
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900/95 border border-white/15 backdrop-blur-xl shadow-2xl py-1 z-50">
                  <div className="px-3 py-2 border-b border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Profile
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-indigo-600/20 transition ${
                          activeUser?.id === u.id
                            ? 'text-indigo-300 font-medium bg-indigo-950/40'
                            : 'text-slate-300'
                        }`}
                      >
                        <span className="truncate">{u.name}</span>
                        <span className="text-[11px] text-slate-400 capitalize">
                          {u.experience}
                        </span>
                      </button>
                    ))}
                    {users.length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-400">No profiles yet.</div>
                    )}
                  </div>
                  <div className="border-t border-white/10 p-1.5">
                    <button
                      type="button"
                      onClick={handleCreateNewProfile}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Create New Profile</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-slate-950/95 backdrop-blur-2xl px-4 pt-2 pb-4 space-y-3">
          <nav className="space-y-1">
            {navLinks.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href || (href === '/plan' && pathname.startsWith('/plan'));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-base font-medium transition ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5 text-indigo-400" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Profile Selector */}
          <div className="pt-3 border-t border-white/10">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Current Profile
            </div>
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelectUser(u)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between mb-1 ${
                  activeUser?.id === u.id
                    ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/30'
                    : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <span>{u.name}</span>
                <span className="text-xs text-slate-400 capitalize">{u.goal.replace('_', ' ')}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={handleCreateNewProfile}
              className="w-full mt-2 flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Profile</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
