import React, { useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { Camera, X } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { PressableSurface } from './PressableSurface';

export interface InAppCameraProps {
  onCapture: (uri: string) => void;
  onClose: () => void;
  onError: (error: unknown) => void;
}

/**
 * Captura dentro de la app (05 §4.3, `expo-camera`). Evita la cámara del sistema
 * (`launchCameraAsync`), que deja la actividad en segundo plano y provocaba el cierre de la app en Android.
 */
export const InAppCamera: React.FC<InAppCameraProps> = ({ onCapture, onClose, onError }) => {
  const { colors, radius } = useAppTheme();
  const cameraRef = useRef<CameraView>(null);
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    if (!cameraRef.current || !isReady || isCapturing) return;
    setIsCapturing(true);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (picture?.uri) onCapture(picture.uri);
    } catch (error) {
      onError(error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setIsReady(true)}
        onMountError={(event) => onError(event.message)}
      />

      <SafeAreaView style={styles.topBar}>
        <PressableSurface
          onPress={onClose}
          pressedColor={colors.primaryDark}
          style={[styles.closeBtn, { borderRadius: radius.button }]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <X size={24} color="#FFFFFF" strokeWidth={2} />
        </PressableSurface>
      </SafeAreaView>

      <View style={styles.bottomBar}>
        <PressableSurface
          onPress={handleCapture}
          disabled={!isReady || isCapturing}
          pressedColor={colors.primaryDark}
          style={[
            styles.shutterBtn,
            { backgroundColor: colors.primary, borderRadius: radius.informarBtn, opacity: isReady ? 1 : 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Sacar una foto"
          accessibilityState={{ disabled: !isReady || isCapturing, busy: isCapturing }}
        >
          {isCapturing ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Camera size={28} color={colors.onPrimary} strokeWidth={2} />
          )}
        </PressableSurface>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  closeBtn: {
    margin: 16,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 37, 37, 0.6)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterBtn: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});
