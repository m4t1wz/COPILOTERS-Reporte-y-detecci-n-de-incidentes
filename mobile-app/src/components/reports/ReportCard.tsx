import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { PressableSurface } from '../common/PressableSurface';
import { MapPin, Calendar, ChevronRight } from 'lucide-react-native';
import { AccessibleText } from '../common/AccessibleText';
import { StatusBadge } from '../common/StatusBadge';
import { useAppTheme } from '../../context/ThemeContext';
import { MyReportItem } from '../../types';
import { formatArgentinaDate } from '../../utils/date-formatter';

export interface ReportCardProps {
  item: MyReportItem;
  onPress: (id: string) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ item, onPress }) => {
  const { colors, radius } = useAppTheme();

  return (
    <PressableSurface
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.card,
        },
      ]}
      onPress={() => onPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`Reporte ${item.report_number}, ${item.category_label}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleColumn}>
          {/* Formato literal: Mi reporte #00000 */}
          <AccessibleText variant="heading3" weight="bold" style={{ color: colors.primary }}>
            Mi reporte {item.report_number}
          </AccessibleText>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
            <AccessibleText variant="body" weight="medium">
              {item.category_label}
            </AccessibleText>
          </View>
        </View>

        <StatusBadge status={item.current_status} label={item.current_status_label} />
      </View>

      {/* Miniatura si existe foto */}
      {item.photo_url ? (
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: item.photo_url }}
            style={[styles.thumbnail, { backgroundColor: colors.background, borderRadius: radius.field }]}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/* Ubicación y coordenadas entre paréntesis */}
      <View style={styles.metaRow}>
        <MapPin size={16} color={colors.primary} strokeWidth={2} style={styles.metaIcon} />
        <AccessibleText variant="small" style={styles.metaText}>
          {item.location.address_reference} ({item.location.latitude.toFixed(4)},{' '}
          {item.location.longitude.toFixed(4)})
        </AccessibleText>
      </View>

      {/* Fecha y hora */}
      <View style={styles.metaRow}>
        <Calendar size={16} color={colors.textMuted} strokeWidth={2} style={styles.metaIcon} />
        <AccessibleText variant="small" muted style={styles.metaText}>
          {formatArgentinaDate(item.created_at)}
        </AccessibleText>
      </View>

      {/* Footer / Acción */}
      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <AccessibleText variant="small" weight="semibold" style={{ color: colors.primary }}>
          Ver historial y seguimiento
        </AccessibleText>
        <ChevronRight size={16} color={colors.primary} strokeWidth={2} />
      </View>
    </PressableSurface>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleColumn: {
    flex: 1,
    marginRight: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  photoContainer: {
    marginVertical: 8,
  },
  thumbnail: {
    width: '100%',
    height: 140,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
});
