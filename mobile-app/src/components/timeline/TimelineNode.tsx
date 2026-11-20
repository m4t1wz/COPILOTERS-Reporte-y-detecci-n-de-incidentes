import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AccessibleText } from '../common/AccessibleText';
import { StatusBadge } from '../common/StatusBadge';
import { useAppTheme } from '../../context/ThemeContext';
import { TimelineNodeItem } from '../../types';
import { formatArgentinaDate } from '../../utils/date-formatter';

export interface TimelineNodeProps {
  item: TimelineNodeItem;
  isFirst: boolean;
  isLast: boolean;
}

export const TimelineNode: React.FC<TimelineNodeProps> = ({
  item,
  isFirst,
  isLast,
}) => {
  const { colors, radius } = useAppTheme();

  return (
    <View style={styles.nodeRow}>
      {/* Columna de la línea vertical y nodo circular */}
      <View style={styles.lineContainer}>
        {/* Línea superior */}
        {!isFirst && <View style={[styles.verticalLine, { backgroundColor: colors.border }]} />}
        
        {/* Nodo circular numerado */}
        <View style={[styles.circleNode, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
          <AccessibleText variant="small" weight="bold" style={[styles.nodeNumber, { color: colors.onPrimary }]}>
            {item.step_order}
          </AccessibleText>
        </View>

        {/* Línea inferior */}
        {!isLast && <View style={[styles.verticalLine, { backgroundColor: colors.border }]} />}
      </View>

      {/* Contenido del hito */}
      <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
        <View style={styles.titleRow}>
          <AccessibleText variant="heading3" weight="semibold">
            {item.step_order}. {item.title}
          </AccessibleText>
          <StatusBadge status={item.status} />
        </View>

        {/* Fecha y Hora en UTC-3 */}
        <AccessibleText variant="small" muted style={styles.dateText}>
          {formatArgentinaDate(item.timestamp)}
        </AccessibleText>

        {/* Descripción funcional */}
        {item.description ? (
          <AccessibleText variant="body" style={styles.descriptionText}>
            {item.description}
          </AccessibleText>
        ) : null}

        {/* Comentario administrativo destacado si existe */}
        {item.admin_comment ? (
          <View style={[styles.adminCommentBox, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.field }]}>
            <AccessibleText variant="small" weight="semibold" style={{ color: colors.primaryDark }}>
              Comentario administrativo:
            </AccessibleText>
            <AccessibleText variant="body" style={styles.adminCommentText}>
              "{item.admin_comment}"
            </AccessibleText>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  nodeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  lineContainer: {
    width: 36,
    alignItems: 'center',
  },
  verticalLine: {
    width: 2,
    flex: 1,
  },
  circleNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    zIndex: 2,
  },
  nodeNumber: {
    fontSize: 11,
    lineHeight: 14,
  },
  contentCard: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    marginLeft: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateText: {
    marginTop: 4,
    marginBottom: 6,
  },
  descriptionText: {
    marginBottom: 8,
  },
  adminCommentBox: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
  },
  adminCommentText: {
    marginTop: 4,
    fontStyle: 'italic',
  },
});
