import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { theme } from '../constants/theme';

const easing = Easing.out(Easing.ease);

/** Entrada de modal igual a la web: velo con fade 150 ms y tarjeta con fade + 4px hacia arriba en 200 ms. */
export function useModalEnter(visible: boolean) {
  const backdrop = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      backdrop.setValue(0);
      card.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: theme.motion.fade, easing, useNativeDriver: true }),
      Animated.timing(card, { toValue: 1, duration: theme.motion.modal, easing, useNativeDriver: true }),
    ]).start();
  }, [visible, backdrop, card]);

  return {
    backdropStyle: { opacity: backdrop },
    cardStyle: {
      opacity: card,
      transform: [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
    },
  };
}
