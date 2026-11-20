import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settings-store';
import { theme } from '../constants/theme';
import { typography, FontSizePreference, ThemePreference } from '../constants/typography';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  onPrimary: string;
  surface: string;
  background: string;
  border: string;
  textMain: string;
  textMuted: string;
}

interface ThemeContextType {
  fontSize: FontSizePreference;
  fontScale: number;
  themePreference: ThemePreference;
  isDark: boolean;
  colors: ThemeColors;
  radius: typeof theme.radius;
  setFontSize: (size: FontSizePreference) => Promise<void>;
  setThemePreference: (theme: ThemePreference) => Promise<void>;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const {
    fontSize,
    themePreference,
    notificationsEnabled,
    setFontSize,
    setThemePreference,
    setNotificationsEnabled,
    loadSettings,
  } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const isDark = useMemo(() => {
    if (themePreference === 'dark') return true;
    if (themePreference === 'light') return false;
    return systemColorScheme === 'dark';
  }, [themePreference, systemColorScheme]);

  const colors = useMemo<ThemeColors>(() => {
    if (isDark) {
      return theme.colors.dark;
    }
    return {
      primary: theme.colors.primary,
      primaryDark: theme.colors.primaryDark,
      primarySoft: theme.colors.primarySoft,
      onPrimary: theme.colors.onPrimary,
      surface: theme.colors.surface,
      background: theme.colors.background,
      border: theme.colors.border,
      textMain: theme.colors.textMain,
      textMuted: theme.colors.textMuted,
    };
  }, [isDark]);

  const fontScale = useMemo(() => {
    return typography.scaleFactors[fontSize] || 1.0;
  }, [fontSize]);

  const value = useMemo(
    () => ({
      fontSize,
      fontScale,
      themePreference,
      isDark,
      colors,
      radius: theme.radius,
      setFontSize,
      setThemePreference,
      notificationsEnabled,
      setNotificationsEnabled,
    }),
    [
      fontSize,
      fontScale,
      themePreference,
      isDark,
      colors,
      setFontSize,
      setThemePreference,
      notificationsEnabled,
      setNotificationsEnabled,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};
