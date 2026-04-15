import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@flip_tracker_theme';

export const LIGHT = {
  isDark: false,
  bg: '#f9fafb',
  card: '#ffffff',
  cardAlt: '#f3f4f6',
  border: '#f0f0f0',
  borderStrong: '#e5e7eb',
  text: '#111827',
  textSub: '#374151',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  inputBg: '#ffffff',
  chartBg: '#ffffff',
  chartLine: '#f3f4f6',
  chartLabel: '#6b7280',
  bestFlipCard: '#111827',
  bestFlipCardText: '#ffffff',
  statusBar: 'dark',
  tabBar: '#ffffff',
  tabBarBorder: '#f0f0f0',
  header: '#ffffff',
  headerText: '#111827',
  placeholder: '#d1d5db',
};

export const DARK = {
  isDark: true,
  bg: '#0f172a',
  card: '#1e293b',
  cardAlt: '#0f172a',
  border: '#334155',
  borderStrong: '#475569',
  text: '#f8fafc',
  textSub: '#e2e8f0',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  inputBg: '#1e293b',
  chartBg: '#1e293b',
  chartLine: '#334155',
  chartLabel: '#94a3b8',
  bestFlipCard: '#020617',
  bestFlipCardText: '#f8fafc',
  statusBar: 'light',
  tabBar: '#1e293b',
  tabBarBorder: '#334155',
  header: '#1e293b',
  headerText: '#f8fafc',
  placeholder: '#475569',
};

const ThemeContext = createContext({
  theme: LIGHT,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(LIGHT);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === 'dark') setTheme(DARK);
    });
  }, []);

  const toggleTheme = async () => {
    const next = theme.isDark ? LIGHT : DARK;
    setTheme(next);
    await AsyncStorage.setItem(THEME_KEY, next.isDark ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
