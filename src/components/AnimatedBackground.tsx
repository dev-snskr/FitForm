'use client';

// FitForm Radiating Lines Canvas Background
// A high-performance, single-canvas generative ambient background.
// Features:
// - 80 thin gradient lines radiating outward from an off-center origin (~70% X, ~35% Y).
// - Soft glowing center origin dot.
// - Theme-aware palettes: cyan/violet/blue on dark, soft indigo/pink on light.
// - Slow system rotation with randomized direction and smooth speed easing every 20-40s.
// - Gentle breathing pulsation on line lengths.
// - Strict 30 FPS throttle, devicePixelRatio clamped to 1.5 for ultra-low CPU/GPU usage.
// - Complete pause when browser tab is hidden (document.hidden).
// - One static frame when 'prefers-reduced-motion' is active.
// - Configurable via `mode`: 'full' | 'static' | 'off'.

import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useBackground, BackgroundMode } from '@/context/BackgroundContext';

interface AnimatedBackgroundProps {
  mode?: BackgroundMode;
  className?: string;
}

interface RadiatingLine {
  baseAngle: number;
  baseLengthRatio: number;
  thickness: number;
  maxOpacity: number;
  colorType: number; // 0, 1, or 2 index into theme palette
  breathePhase: number;
  breatheSpeed: number;
}

export default function AnimatedBackground({
  mode: propMode,
  className = '',
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();
  const context = useBackground();

  // Prop takes precedence over context if provided
  const activeMode: BackgroundMode = propMode ?? context.mode ?? 'full';

  useEffect(() => {
    if (activeMode === 'off') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isTabVisible = !document.hidden;
    const isDark = resolvedTheme === 'dark';

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const isStatic = activeMode === 'static' || prefersReducedMotion;

    // Line Count: 80 lines (within 70-90 requirement)
    const lineCount = 80;
    const lines: RadiatingLine[] = [];

    // Distribute angles with subtle natural variation
    for (let i = 0; i < lineCount; i++) {
      const angleStep = (Math.PI * 2) / lineCount;
      const angleJitter = (Math.random() - 0.5) * 0.08;
      lines.push({
        baseAngle: i * angleStep + angleJitter,
        baseLengthRatio: 0.38 + Math.random() * 0.58, // 38% to 96% of screen diagonal
        thickness: 0.8 + Math.random() * 1.3, // 0.8px to 2.1px thin lines
        maxOpacity: 0.12 + Math.random() * 0.22, // subtle 12% to 34% opacity for readability
        colorType: Math.floor(Math.random() * 3),
        breathePhase: Math.random() * Math.PI * 2,
        breatheSpeed: 0.0008 + Math.random() * 0.0016,
      });
    }

    // Color palettes
    // Dark mode: Cyan (6, 182, 212), Violet (139, 92, 246), Blue (59, 130, 246)
    const darkPalette = [
      '6, 182, 212',
      '139, 92, 246',
      '59, 130, 246',
    ];
    // Light mode: Soft Indigo (99, 102, 241), Soft Pink (236, 72, 153), Lavender (168, 85, 247)
    const lightPalette = [
      '99, 102, 241',
      '236, 72, 153',
      '168, 85, 247',
    ];
    const currentPalette = isDark ? darkPalette : lightPalette;

    // Viewport and DPR handling (clamped to 1.5 for performance)
    let width = 0;
    let height = 0;
    let originX = 0;
    let originY = 0;
    let diagonal = 0;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Origin point: ~70% across and ~35% down
      originX = width * 0.7;
      originY = height * 0.35;
      diagonal = Math.hypot(width, height);

      if (isStatic) {
        drawFrame(0, 0);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Rotation & smooth easing system
    // Random initial direction & speed
    let currentSpeed = (Math.random() > 0.5 ? 1 : -1) * (0.0006 + Math.random() * 0.001);
    let targetSpeed = currentSpeed;
    let rotationAngle = Math.random() * Math.PI * 2;
    let lastSpeedChangeTime = performance.now();
    let speedChangeInterval = 20000 + Math.random() * 20000; // 20s to 40s

    // 30 FPS Cap Timing
    let lastFrameTime = performance.now();
    const frameInterval = 1000 / 30; // ~33.33ms

    // Frame Drawing Routine
    const drawFrame = (rotAngle: number, timeMs: number) => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw soft glowing dot at the origin
      const originGlowRadius = 26;
      const originGrad = ctx.createRadialGradient(
        originX,
        originY,
        0,
        originX,
        originY,
        originGlowRadius
      );
      const glowBaseColor = isDark ? '6, 182, 212' : '99, 102, 241';
      originGrad.addColorStop(0, `rgba(${glowBaseColor}, 0.85)`);
      originGrad.addColorStop(0.25, `rgba(${glowBaseColor}, 0.4)`);
      originGrad.addColorStop(1, `rgba(${glowBaseColor}, 0)`);

      ctx.beginPath();
      ctx.arc(originX, originY, originGlowRadius, 0, Math.PI * 2);
      ctx.fillStyle = originGrad;
      ctx.fill();

      // Sharp core center point
      ctx.beginPath();
      ctx.arc(originX, originY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${glowBaseColor}, 0.95)`;
      ctx.fill();

      // 2. Draw 80 radiating lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Rotation angle
        const angle = line.baseAngle + rotAngle;

        // Gentle breathing pulsation
        const breathe = Math.sin(timeMs * line.breatheSpeed + line.breathePhase);
        const length = diagonal * line.baseLengthRatio * (1 + 0.06 * breathe);

        const endX = originX + Math.cos(angle) * length;
        const endY = originY + Math.sin(angle) * length;

        // Line gradient: brightest at origin, fading to transparent at end
        const grad = ctx.createLinearGradient(originX, originY, endX, endY);
        const color = currentPalette[line.colorType];

        grad.addColorStop(0, `rgba(${color}, ${line.maxOpacity})`);
        grad.addColorStop(0.18, `rgba(${color}, ${line.maxOpacity * 0.75})`);
        grad.addColorStop(0.65, `rgba(${color}, ${line.maxOpacity * 0.25})`);
        grad.addColorStop(1, `rgba(${color}, 0)`);

        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = line.thickness;
        ctx.strokeStyle = grad;
        ctx.stroke();
      }
    };

    // Render loop for full animation mode
    const animate = (now: number) => {
      if (!isTabVisible) return;

      const elapsed = now - lastFrameTime;

      if (elapsed >= frameInterval) {
        lastFrameTime = now - (elapsed % frameInterval);

        // Smooth speed easing every 20-40 seconds
        if (now - lastSpeedChangeTime > speedChangeInterval) {
          lastSpeedChangeTime = now;
          speedChangeInterval = 20000 + Math.random() * 20000;
          // Pick new random direction and speed
          targetSpeed = (Math.random() > 0.5 ? 1 : -1) * (0.0006 + Math.random() * 0.0012);
        }

        // Smooth exponential ease toward target speed (no sudden jumps)
        currentSpeed += (targetSpeed - currentSpeed) * 0.015;
        rotationAngle += currentSpeed;

        drawFrame(rotationAngle, now);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    // Handle Tab Visibility (Pause completely when hidden)
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !isStatic) {
        lastFrameTime = performance.now();
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial render
    if (isStatic) {
      drawFrame(0, 0);
    } else {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeMode, resolvedTheme]);

  if (activeMode === 'off') return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none ${className}`}
    >
      {/* Base radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-white dark:from-slate-900/40 dark:via-slate-950 dark:to-[#03070d] transition-colors duration-500" />

      {/* Single Radiating Lines Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}
