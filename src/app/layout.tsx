// FitForm Root Layout
// Provides ThemeProvider (dark/light/system), global AnimatedBackground, and shared Navigation Bar.

import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import AnimatedBackground from '@/components/AnimatedBackground';
import { ThemeProvider } from '@/components/ThemeProvider';
import { BackgroundProvider } from '@/context/BackgroundContext';

export const metadata: Metadata = {
  title: 'FitForm - AI Gym & Form Trainer',
  description: 'AI-assisted personalized workout plans, form checking, and progress tracking.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <BackgroundProvider>
            {/* Global Radiating Lines Background with Theme-Aware Glows */}
            <AnimatedBackground />

            {/* Global Navigation */}
            <Navbar />

            {/* Page Content */}
            <main className="relative z-10 flex-1 flex flex-col">
              {children}
            </main>
          </BackgroundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
