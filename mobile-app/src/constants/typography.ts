export const typography = {
  fontFamily: 'Inter',
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  baseSizes: {
    heading1: 22,
    heading2: 18,
    heading3: 16,
    body: 15,
    label: 14,
    small: 12,
  },
  scaleFactors: {
    normal: 1.0,
    large: 1.25,
    xlarge: 1.5,
  }
};

export type FontSizePreference = 'normal' | 'large' | 'xlarge';
export type ThemePreference = 'system' | 'light' | 'dark';
