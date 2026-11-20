import React, { useRef } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableSurfaceProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Fondo al presionar; por defecto `primarySoft` del tema activo (igual que el hover de la web). */
  pressedColor?: string;
  children?: React.ReactNode;
}

/** Feedback táctil por transición de color (150 ms ease-out) en lugar de atenuar la opacidad. */
export const PressableSurface: React.FC<PressableSurfaceProps> = ({
  style,
  pressedColor,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...props
}) => {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(0)).current;

  const baseColor = (StyleSheet.flatten(style)?.backgroundColor as string | undefined) ?? 'transparent';
  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [baseColor, pressedColor ?? colors.primarySoft],
  });

  const animateTo = (toValue: number) =>
    Animated.timing(progress, {
      toValue,
      duration: theme.motion.press,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

  const handlePressIn = (e: GestureResponderEvent) => {
    animateTo(1);
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    animateTo(0);
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { backgroundColor }]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
};
