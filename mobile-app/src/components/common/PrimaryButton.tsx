import React from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { AccessibleText } from './AccessibleText';
import { PressableSurface, PressableSurfaceProps } from './PressableSurface';

export interface PrimaryButtonProps extends PressableSurfaceProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

const DANGER = '#D32F2F';
const DANGER_PRESSED = '#B71C1C';

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  style,
  ...props
}) => {
  const { colors, radius } = useAppTheme();

  // Mismas variantes que la web (08 §6.2): primario primary -> primaryDark; superficies -> primarySoft.
  let backgroundColor = colors.primary;
  let pressedColor = colors.primaryDark;
  let textColor = colors.onPrimary;
  let borderColor = 'transparent';
  let borderWidth = 0;

  if (variant === 'secondary') {
    backgroundColor = colors.surface;
    pressedColor = colors.primarySoft;
    textColor = colors.textMain;
    borderColor = colors.border;
    borderWidth = 1;
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
    pressedColor = colors.primarySoft;
    textColor = colors.primary;
    borderColor = colors.primary;
    borderWidth = 1;
  } else if (variant === 'ghost') {
    backgroundColor = 'transparent';
    pressedColor = colors.primarySoft;
    textColor = colors.primary;
  } else if (variant === 'danger') {
    backgroundColor = DANGER;
    pressedColor = DANGER_PRESSED;
    textColor = '#FFFFFF';
  }

  const isDisabled = disabled || loading;

  return (
    <PressableSurface
      disabled={isDisabled}
      pressedColor={pressedColor}
      style={[
        styles.baseButton,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          borderRadius: radius.button,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <View style={styles.leftIconContainer}>{icon}</View>
          )}
          <AccessibleText
            weight="semibold"
            style={[styles.buttonText, { color: textColor }]}
          >
            {title}
          </AccessibleText>
          {icon && iconPosition === 'right' && (
            <View style={styles.rightIconContainer}>{icon}</View>
          )}
        </View>
      )}
    </PressableSurface>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    minHeight: 56, // Mínimo táctil accesible 56dp
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    textAlign: 'center',
  },
  leftIconContainer: {
    marginRight: 8,
  },
  rightIconContainer: {
    marginLeft: 8,
  },
});
