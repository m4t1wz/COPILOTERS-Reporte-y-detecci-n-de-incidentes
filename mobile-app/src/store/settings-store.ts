import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSizePreference, ThemePreference } from '../constants/typography';

const SETTINGS_STORAGE_KEY = '@incidentes_formosa:settings';

interface SettingsState {
  fontSize: FontSizePreference;
  themePreference: ThemePreference;
  notificationsEnabled: boolean;
  isLoaded: boolean;
  setFontSize: (fontSize: FontSizePreference) => Promise<void>;
  setThemePreference: (themePreference: ThemePreference) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  fontSize: 'normal',
  themePreference: 'system',
  notificationsEnabled: false, // Inicia desactivado por defecto conforme a especificación
  isLoaded: false,

  setFontSize: async (fontSize: FontSizePreference) => {
    set({ fontSize });
    try {
      const current = {
        fontSize,
        themePreference: get().themePreference,
        notificationsEnabled: get().notificationsEnabled,
      };
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Ignorar fallo de almacenamiento
    }
  },

  setThemePreference: async (themePreference: ThemePreference) => {
    set({ themePreference });
    try {
      const current = {
        fontSize: get().fontSize,
        themePreference,
        notificationsEnabled: get().notificationsEnabled,
      };
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Ignorar fallo de almacenamiento
    }
  },

  setNotificationsEnabled: async (notificationsEnabled: boolean) => {
    set({ notificationsEnabled });
    try {
      const current = {
        fontSize: get().fontSize,
        themePreference: get().themePreference,
        notificationsEnabled,
      };
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Ignorar fallo de almacenamiento
    }
  },

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          fontSize: parsed.fontSize || 'normal',
          themePreference: parsed.themePreference || 'system',
          notificationsEnabled: parsed.notificationsEnabled ?? false,
          isLoaded: true,
        });
        return;
      }
    } catch {
      // Utilizar valores por defecto
    }
    set({ isLoaded: true });
  },
}));
