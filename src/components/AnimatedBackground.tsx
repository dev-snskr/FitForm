'use client';

// FitForm Animated Background Layer
// Renders slowly drifting blurred gradient blobs and lightweight floating canvas particles.
// Features:
// - Follows theme colors (deep blue/purple/teal in dark mode, soft pastel in light mode).
// - Reusable with `enabled` and `showParticles` props (for easy disabling on camera pages in Step 3).
// - Pauses when browser tab is inactive (document.hidden) to conserve battery/CPU.
// - Respects 'prefers-reduced-motion': disables animations when enabled in system settings.
// - Fixed behind content with pointer-events-none, never blocking clicks or hurting readability.

import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

interface AnimatedBackgroundProps {
  enabled?: boolean;
  showParticles?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  alphaSpeed: number;
}

export default function AnimatedBackground({
  enabled = true,
  showParticles = true,
  className = '',
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!enabled || !showParticles) return;

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      return; // Do not run particle animation if reduced motion is preferred
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isTabVisible = !document.hidden;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize 24 subtle floating particles
    const particleCount = 24;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35 - 0.1, // Slight upward drift
        alpha: Math.random() * 0.35 + 0.1,
        alphaSpeed: (Math.random() - 0.5) * 0.005,
      });
    }

    // Visibility change handler to pause when tab is in background
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        render();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const render = () => {
      if (!isTabVisible) return;

      const isDark = resolvedTheme === 'dark';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Particle color matches theme
      const particleColor = isDark
        ? '147, 197, 253' // light blue / indigo in dark mode
        : '99, 102, 241'; // soft indigo in light mode

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around screen boundaries
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Subtle alpha pulsing
        p.alpha += p.alphaSpeed;
        if (p.alpha <= 0.08 || p.alpha >= 0.45) {
          p.alphaSpeed = -p.alphaSpeed;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particleColor}, ${Math.max(0.05, Math.min(0.5, p.alpha))})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `rgba(${particleColor}, 0.3)`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, showParticles, resolvedTheme]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none ${className}`}
    >
      {/* Base radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-white dark:from-slate-900/40 dark:via-slate-950 dark:to-[#03070d] transition-colors duration-500" />

      {/* Slowly drifting blurred gradient blobs */}
      <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full blur-[110px] animate-blob-slow bg-indigo-400/25 dark:bg-indigo-600/20 transition-colors duration-500" />
      <div className="absolute top-1/4 -right-36 w-[36rem] h-[36rem] rounded-full blur-[120px] animate-blob-reverse bg-cyan-300/25 dark:bg-cyan-500/15 transition-colors duration-500" />
      <div className="absolute -bottom-40 left-1/3 w-[38rem] h-[38rem] rounded-full blur-[130px] animate-blob-slow bg-purple-300/20 dark:bg-purple-600/15 transition-colors duration-500" />
      <div className="absolute bottom-1/4 -left-20 w-[26rem] h-[26rem] rounded-full blur-[100px] animate-blob-reverse bg-rose-200/20 dark:bg-emerald-600/10 transition-colors duration-500" />

      {/* Floating Canvas Particles */}
      {showParticles && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
        />
      )}
    </div>
  );
}
