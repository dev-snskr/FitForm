'use client';

// FitForm Theme Provider Wrapper
// Uses next-themes to seamlessly toggle between dark, light, and system modes.
// Stores preference in localStorage and handles hydration gracefully without theme flashing.

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
