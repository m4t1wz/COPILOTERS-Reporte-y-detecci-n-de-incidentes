import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { typography } from '../../constants/typography';

export interface AccessibleTextProps extends TextProps {
  variant?: 'heading1' | 'heading2' | 'heading3' | 'body' | 'label' | 'small';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: string;
  muted?: boolean;
}

export const AccessibleText: React.FC<AccessibleTextProps> = ({
  variant = 'body',
  weight = 'regular',
  color,
  muted = false,
  style,
  children,
  ...props
}) => {
  const { fontScale, colors } = useAppTheme();

  const baseSize = typography.baseSizes[variant] || typography.baseSizes.body;
  const scaledSize = Math.round(baseSize * fontScale);

  // Flatten incoming style if array or object
  const flatStyle = StyleSheet.flatten(style) || {};

  const userFontSize = flatStyle.fontSize;
  const finalFontSize = userFontSize
    ? Math.round(userFontSize * fontScale)
    : scaledSize;

  const fontColor = color || (muted ? colors.textMuted : colors.textMain);

  const textStyle: TextStyle = {
    fontFamily: typography.fontFamily,
    fontSize: finalFontSize,
    fontWeight: typography.weights[weight] || typography.weights.regular,
    color: fontColor,
    lineHeight: Math.round(finalFontSize * 1.35),
  };

  return (
    <Text style={[textStyle, style, { fontSize: finalFontSize }]} {...props}>
      {children}
    </Text>
  );
};
