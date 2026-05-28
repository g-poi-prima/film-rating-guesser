import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type AppTheme = 'studio-light' | 'studio-dark' | 'late-show' | 'verita' | 'override';

const DARK_THEMES: AppTheme[] = ['studio-dark', 'late-show', 'override'];
const VALID_THEMES: AppTheme[] = ['studio-light', 'studio-dark', 'late-show', 'verita', 'override'];

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  dark: boolean;
  toggle: () => void; // backward compat: cycles studio-light ↔ studio-dark
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('theme');
    // Migrate old boolean-based format
    if (saved === 'dark') return 'studio-dark';
    if (saved === 'light') return 'studio-light';
    if (saved && VALID_THEMES.includes(saved as AppTheme)) return saved as AppTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'studio-dark' : 'studio-light';
  });

  const dark = DARK_THEMES.includes(theme);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('dark', dark);
    html.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme, dark]);

  // Kept for backward compat (Navbar used to call this via the Sun/Moon button).
  // Cycles studio-light ↔ studio-dark; other themes are unchanged.
  const toggle = () =>
    setTheme((t) => {
      if (t === 'studio-light') return 'studio-dark';
      if (t === 'studio-dark') return 'studio-light';
      return t;
    });

  return (
    <ThemeContext.Provider value={{ theme, setTheme, dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
