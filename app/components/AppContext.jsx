'use client';
import { createContext, useContext, useMemo, useState, useCallback } from 'react';

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [analysis, setAnalysis] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeed, setChatSeed] = useState('');

  const askAssistant = useCallback((text = '') => {
    setChatSeed(text);
    setChatOpen(true);
  }, []);

  const value = useMemo(
    () => ({ analysis, setAnalysis, chatOpen, setChatOpen, chatSeed, setChatSeed, askAssistant }),
    [analysis, chatOpen, chatSeed, askAssistant],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
