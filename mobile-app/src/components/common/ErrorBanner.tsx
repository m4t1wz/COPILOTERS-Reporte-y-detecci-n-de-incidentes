import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { AccessibleText } from './AccessibleText';
import { useAppTheme } from '../../context/ThemeContext';

export interface ErrorBannerProps {
  message?: string | null;
  onDismiss?: () => void;
}

// Mismo aviso que la web: fondo primarySoft, borde primario tenue, texto primaryDark.
export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message }) => {
  const { colors, radius, isDark } = useAppTheme();
  if (!message) return null;

  const textColor = isDark ? colors.primary : colors.primaryDark;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.bannerContainer,
        { backgroundColor: colors.primarySoft, borderColor: colors.primary + '4D', borderRadius: radius.field },
      ]}
    >
      <View style={styles.iconContainer}>
        <AlertCircle size={20} color={textColor} strokeWidth={2} />
      </View>
      <View style={styles.textContainer}>
        <AccessibleText variant="body" weight="medium" style={[styles.errorText, { color: textColor }]}>
          {message}
        </AccessibleText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  errorText: {
    fontSize: 14,
  },
});
