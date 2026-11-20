import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { PressableSurface } from '../../components/common/PressableSurface';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  MapPin,
  Camera,
  Trash2,
  Send,
  RefreshCw,
  Edit3,
} from 'lucide-react-native';
import { AccessibleText } from '../../components/common/AccessibleText';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { CategorySelector } from '../../components/common/CategorySelector';
import { ImagePickerModal, PickedImage } from '../../components/common/ImagePickerModal';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { useLocation } from '../../hooks/useLocation';
import { useReportSubmit } from '../../hooks/useReportSubmit';
import { useAppTheme } from '../../context/ThemeContext';
import { IncidentCategory } from '../../types';

export default function NewReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ manualLat?: string; manualLon?: string }>();
  const { colors, radius } = useAppTheme();

  // Estado del formulario
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | null>(null);
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [comment, setComment] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Hook de Ubicación GPS
  const {
    latitude,
    longitude,
    addressReference,
    isInsideFormosa,
    isLoading: isLocationLoading,
    errorMessage: locationError,
    refreshLocation,
    setManualCoordinates,
  } = useLocation();

  // Hook de envío de reporte
  const { submit, isSubmitting, errorMessage: submitError } = useReportSubmit();

  // Actualizar coordenadas si vuelve desde la pantalla de corrección manual
  useEffect(() => {
    if (params.manualLat && params.manualLon) {
      const lat = parseFloat(params.manualLat);
      const lon = parseFloat(params.manualLon);
      setManualCoordinates(lat, lon);
    }
  }, [params.manualLat, params.manualLon, setManualCoordinates]);

  const handleOpenLocationPicker = () => {
    router.push({
      pathname: '/report/location-picker',
      params: {
        lat: String(latitude),
        lon: String(longitude),
      },
    });
  };

  const handleRemovePhoto = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignorar
    }
    setPhoto(null);
  };

  const handleSubmit = async () => {
    setValidationError(null);

    // 1. Categoría obligatoria
    if (!selectedCategory) {
      setValidationError('Por favor seleccioná el tipo de incidente.');
      return;
    }

    // 2. Coordenadas válidas dentro de Formosa
    if (!isInsideFormosa) {
      setValidationError('La ubicación debe encontrarse dentro de la provincia de Formosa.');
      return;
    }

    // 3. Regla condicional foto / comentario
    const hasPhoto = Boolean(photo && photo.uri);
    const hasComment = Boolean(comment.trim().length > 0);

    if (!hasPhoto && !hasComment) {
      setValidationError(
        'Como no adjuntaste foto, debés describir qué ocurrió para que podamos atender el aviso.'
      );
      return;
    }

    // 4. Si la categoría es "Otro", el comentario es obligatorio si no hay foto
    if (selectedCategory === 'otro' && !hasPhoto && !hasComment) {
      setValidationError(
        'Al seleccionar "Otro", debés especificar qué sucedió en el campo comentario.'
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignorar
    }

    const confirmation = await submit({
      category: selectedCategory,
      latitude,
      longitude,
      comment: comment.trim() || null,
      photo: photo ? { uri: photo.uri, name: photo.name, type: photo.type } : null,
    });

    if (confirmation) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignorar
      }

      router.replace({
        pathname: '/report/confirmation',
        params: {
          confirmationData: JSON.stringify(confirmation),
        },
      });
    }
  };

  const handleBack = () => {
    router.back();
  };

  const isCommentRequired = !photo;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <PressableSurface
            onPress={handleBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver al mapa"
          >
            <ArrowLeft size={22} color={colors.textMain} strokeWidth={2} />
          </PressableSurface>
          <AccessibleText variant="heading2" weight="semibold">
            Nuevo reporte
          </AccessibleText>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ErrorBanner message={validationError || submitError || locationError} />

          {/* 1. Categoría de incidente */}
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
            <View style={styles.sectionTitleRow}>
              <AccessibleText variant="heading3" weight="semibold">
                1. Tipo de incidente
              </AccessibleText>
              <AccessibleText variant="small" style={{ color: colors.primary }}>
                (Obligatorio)
              </AccessibleText>
            </View>
            <CategorySelector
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Campo adicional si seleccionó «Otro» */}
            {selectedCategory === 'otro' && (
              <View style={[styles.otroNoticeBox, { backgroundColor: colors.primarySoft }]}>
                <AccessibleText variant="small" weight="medium" style={{ color: colors.primaryDark }}>
                  Por favor, especificá en el campo comentario qué sucedió{' '}
                  {isCommentRequired ? '(obligatorio al no haber fotografía)' : ''}.
                </AccessibleText>
              </View>
            )}
          </View>

          {/* 2. Ubicación GPS */}
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
            <View style={styles.sectionTitleRow}>
              <AccessibleText variant="heading3" weight="semibold">
                2. Ubicación del incidente
              </AccessibleText>
              <AccessibleText variant="small" style={{ color: colors.primary }}>
                (Automático)
              </AccessibleText>
            </View>

            <View style={[styles.locationBox, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.field }]}>
              <View style={styles.locationHeader}>
                <MapPin size={20} color={colors.primary} strokeWidth={2} />
                <View style={styles.locationTextContainer}>
                  <AccessibleText variant="body" weight="medium">
                    {addressReference}
                  </AccessibleText>
                  <AccessibleText variant="small" muted>
                    Coordenadas: ({latitude.toFixed(5)}, {longitude.toFixed(5)})
                  </AccessibleText>
                </View>
                <PressableSurface
                  onPress={refreshLocation}
                  disabled={isLocationLoading}
                  style={styles.refreshBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Actualizar posición GPS"
                  accessibilityState={{ busy: isLocationLoading, disabled: isLocationLoading }}
                >
                  {isLocationLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <RefreshCw size={18} color={colors.textMuted} strokeWidth={2} />
                  )}
                </PressableSurface>
              </View>
            </View>

            {/* Botón: «¿La ubicación no es correcta? ¡Corregir!» (Literal según contexto) */}
            <PressableSurface
              style={[styles.correctLocationBtn, { borderColor: colors.border, borderRadius: radius.button, backgroundColor: colors.surface }]}
              onPress={handleOpenLocationPicker}
              accessibilityRole="button"
              accessibilityLabel="Corregir ubicación en el mapa"
            >
              <Edit3 size={18} color={colors.primary} strokeWidth={2} />
              <AccessibleText
                variant="label"
                weight="semibold"
                style={[styles.correctLocationText, { color: colors.primary }]}
              >
                ¿La ubicación no es correcta? ¡Corregir!
              </AccessibleText>
            </PressableSurface>
          </View>

          {/* 3. Evidencia Fotográfica */}
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
            <View style={styles.sectionTitleRow}>
              <AccessibleText variant="heading3" weight="semibold">
                3. Fotografía
              </AccessibleText>
              <AccessibleText variant="small" muted>
                (Opcional)
              </AccessibleText>
            </View>

            {photo ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: photo.uri }} style={[styles.previewImage, { borderRadius: radius.card }]} />
                <PressableSurface
                  style={[styles.removePhotoBtn, { backgroundColor: '#D32F2F', borderRadius: radius.button }]}
                  pressedColor="#B71C1C"
                  onPress={handleRemovePhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar fotografía adjunta"
                >
                  <Trash2 size={16} color="#FFFFFF" strokeWidth={2} />
                  <AccessibleText variant="small" weight="medium" style={styles.removePhotoText}>
                    Eliminar foto
                  </AccessibleText>
                </PressableSurface>
              </View>
            ) : (
              <PressableSurface
                style={[styles.addPhotoBtn, { borderColor: colors.border, borderRadius: radius.button, backgroundColor: colors.background }]}
                onPress={() => setShowImagePicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Agregar una fotografía"
              >
                <Camera size={24} color={colors.primary} strokeWidth={2} />
                <AccessibleText variant="label" weight="medium" style={styles.addPhotoText}>
                  Sacar foto o adjuntar desde archivo
                </AccessibleText>
              </PressableSurface>
            )}
          </View>

          {/* 4. Comentario */}
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
            <View style={styles.sectionTitleRow}>
              <AccessibleText variant="heading3" weight="semibold">
                4. Comentario
              </AccessibleText>
              <AccessibleText
                variant="small"
                style={{ color: isCommentRequired ? colors.primary : colors.textMuted }}
              >
                {isCommentRequired ? '(Obligatorio sin foto)' : '(Opcional)'}
              </AccessibleText>
            </View>

            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  borderColor: isCommentRequired && !comment.trim() ? colors.primary : colors.border,
                  borderRadius: radius.field,
                  color: colors.textMain,
                },
              ]}
              placeholder="Describí brevemente la situación, gravedad o referencias adicionales..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              maxLength={1000}
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
            />

            <View style={styles.charCountRow}>
              {isCommentRequired && (
                <AccessibleText variant="small" style={{ color: colors.primary }}>
                  Al no adjuntar foto, debés describir qué ocurrió.
                </AccessibleText>
              )}
              <AccessibleText variant="small" muted style={{ marginLeft: 'auto' }}>
                {comment.length}/1000
              </AccessibleText>
            </View>
          </View>

          {/* Botón de Envío */}
          <View style={styles.submitSection}>
            <PrimaryButton
              title="Enviar Reporte"
              onPress={handleSubmit}
              loading={isSubmitting}
              icon={<Send size={18} color={colors.onPrimary} strokeWidth={2} />}
              style={styles.submitBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Selector de Foto (Cámara / Galería) */}
      <ImagePickerModal
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={setPhoto}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    borderWidth: 1,
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  otroNoticeBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 6,
  },
  locationBox: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  refreshBtn: {
    padding: 8,
  },
  correctLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    minHeight: 48,
  },
  correctLocationText: {
    marginLeft: 8,
    fontSize: 14,
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    minHeight: 64, // Accesible > 56dp
  },
  addPhotoText: {
    marginLeft: 10,
    fontSize: 14,
  },
  previewContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  removePhotoText: {
    color: '#FFFFFF',
    marginLeft: 6,
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    fontFamily: 'Inter',
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  submitSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  submitBtn: {
    minHeight: 56, // Altura mínima táctil accesible
  },
});
