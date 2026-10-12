import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

import { palettes, type Palette, type ThemeName } from './palette';

type ThemeCtx = { theme: Palette; setTheme: (name: ThemeName) => void };

const Ctx = createContext<ThemeCtx>({ theme: palettes.aurora, setTheme: () => {} });

const KEY = 'ibuvio.theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<ThemeName>('aurora');

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((v) => {
        if (v === 'aurora' || v === 'light' || v === 'dark') setName(v);
      })
      .catch(() => {});
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setName(next);
    SecureStore.setItemAsync(KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ theme: palettes[name], setTheme }), [name, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
