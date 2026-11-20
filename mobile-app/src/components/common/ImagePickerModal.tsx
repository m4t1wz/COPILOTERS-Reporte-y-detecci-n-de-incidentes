import React, { useState } from 'react';
import {
  Animated,
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera as ExpoCamera } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { AccessibleText } from './AccessibleText';
import { useAppTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import { PressableSurface } from './PressableSurface';
import { useModalEnter } from '../../hooks/useModalEnter';
import { InAppCamera } from './InAppCamera';

export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

export interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (image: PickedImage) => void;
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  visible,
  onClose,
  onImageSelected,
}) => {
  const { colors, radius } = useAppTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const { backdropStyle, cardStyle } = useModalEnter(visible);

  const handleRequestClose = () => {
    if (isCameraOpen) setIsCameraOpen(false);
    else onClose();
  };

  const processAndCompressImage = async (originalUri: string) => {
    setIsProcessing(true);
    try {
      // Reescalar a máximo 1600px de lado mayor y comprimir a 80% JPEG
      const manipulated = await ImageManipulator.manipulateAsync(
        originalUri,
        [{ resize: { width: 1600 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignorar
      }

      onImageSelected({
        uri: manipulated.uri,
        name: `incidente-${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
      onClose();
    } catch {
      // Si falla la manipulación, devolver la imagen original
      onImageSelected({
        uri: originalUri,
        name: `incidente-${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCameraError = (error: unknown) => {
    console.warn('[ImagePicker] camera', error);
    setIsCameraOpen(false);
    Alert.alert('Error', 'No se pudo abrir la cámara.');
  };

  const handleLaunchCamera = async () => {
    try {
      const permission = await ExpoCamera.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Se necesita permiso para acceder a la cámara.');
        return;
      }
      setIsCameraOpen(true);
    } catch (error) {
      handleCameraError(error);
    }
  };

  const handleCameraCapture = async (uri: string) => {
    setIsCameraOpen(false);
    await processAndCompressImage(uri);
  };

  const handleLaunchGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Se necesita permiso para acceder a la galería de fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processAndCompressImage(result.assets[0].uri);
      }
    } catch (error) {
      console.warn('[ImagePicker] launchGallery', error);
      Alert.alert('Error', 'No se pudo abrir la galería de imágenes.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleRequestClose}
    >
      {isCameraOpen ? (
        <InAppCamera
          onCapture={handleCameraCapture}
          onClose={() => setIsCameraOpen(false)}
          onError={handleCameraError}
        />
      ) : (
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }, cardStyle]}>
              {/* Header */}
              <View style={styles.dialogHeader}>
                <AccessibleText variant="heading3" weight="semibold">
                  Adjuntar evidencia fotográfica
                </AccessibleText>
                <PressableSurface onPress={onClose} style={[styles.closeBtn, { borderRadius: radius.button }]} accessibilityRole="button" accessibilityLabel="Cerrar">
                  <X size={20} color={colors.textMuted} strokeWidth={1.75} />
                </PressableSurface>
              </View>

              {isProcessing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <AccessibleText variant="body" style={styles.processingText}>
                    Optimizando fotografía...
                  </AccessibleText>
                </View>
              ) : (
                <View style={styles.buttonsContainer}>
                  {/* Opción Cámara */}
                  <PressableSurface
                    style={[styles.optionButton, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.button }]}
                    onPress={handleLaunchCamera}
                    accessibilityRole="button"
                    accessibilityLabel="Sacar una foto con la cámara"
                  >
                    <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft, borderRadius: radius.button }]}>
                      <Camera size={24} color={colors.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <AccessibleText variant="label" weight="semibold">
                        Sacar una foto
                      </AccessibleText>
                      <AccessibleText variant="small" muted>
                        Abrir cámara del dispositivo
                      </AccessibleText>
                    </View>
                  </PressableSurface>

                  {/* Opción Galería */}
                  <PressableSurface
                    style={[styles.optionButton, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.button }]}
                    onPress={handleLaunchGallery}
                    accessibilityRole="button"
                    accessibilityLabel="Elegir foto desde la galería de archivos"
                  >
                    <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft, borderRadius: radius.button }]}>
                      <ImageIcon size={24} color={colors.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <AccessibleText variant="label" weight="semibold">
                        Elegir desde galería
                      </AccessibleText>
                      <AccessibleText variant="small" muted>
                        Seleccionar imagen almacenada
                      </AccessibleText>
                    </View>
                  </PressableSurface>
                </View>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.overlay.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  processingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: 12,
  },
  buttonsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    minHeight: 64, // Accesible > 56dp
  },
  iconCircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
});
