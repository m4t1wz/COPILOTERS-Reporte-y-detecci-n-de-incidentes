import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Activity, Check, CheckCircle2, Clock, Search, XCircle } from 'lucide-react-native';
import { ReportStatus } from '../../types';
import { REPORT_STATUSES } from '../../constants/categories';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';
import { AccessibleText } from './AccessibleText';

export interface StatusBadgeProps {
  status: ReportStatus;
  label?: string;
}

const STATUS_ICONS: Record<ReportStatus, typeof Clock> = {
  pendiente: Clock,
  en_revision: Search,
  verificado: CheckCircle2,
  en_seguimiento: Activity,
  resuelto: Check,
  descartado: XCircle,
};

// Acentos alineados con NEXO MAP Admin Web; resuelto y en_revision siguen el tema activo.
const accentFor = (status: ReportStatus, colors: ThemeColors): string => {
  if (status === 'resuelto') return colors.textMain;
  if (status === 'en_revision') return colors.primary;
  return REPORT_STATUSES[status]?.color ?? colors.textMuted;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const { colors, radius } = useAppTheme();
  const Icon = STATUS_ICONS[status] ?? Clock;
  const displayLabel = label || REPORT_STATUSES[status]?.label || status;

  return (
    <View
      style={[
        styles.badgeContainer,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.field },
      ]}
    >
      <Icon size={14} color={accentFor(status, colors)} strokeWidth={2} style={styles.icon} />
      <AccessibleText variant="small" weight="medium" style={[styles.badgeText, { color: colors.textMain }]}>
        {displayLabel}
      </AccessibleText>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
  },
});
