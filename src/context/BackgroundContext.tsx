'use client';

// FitForm Background Mode Context
// Allows individual pages (such as live camera form checking in Step 3)
// to switch background mode to 'full' (default), 'static', or 'off'.

import React, { createContext, useContext, useState } from 'react';

export type BackgroundMode = 'full' | 'static' | 'off';

interface BackgroundContextType {
  mode: BackgroundMode;
  setMode: (mode: BackgroundMode) => void;
}

const BackgroundContext = createContext<BackgroundContextType>({
  mode: 'full',
  setMode: () => {},
});

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<BackgroundMode>('full');

  return (
    <BackgroundContext.Provider value={{ mode, setMode }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  return useContext(BackgroundContext);
}
