import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TimelineNode } from './TimelineNode';
import { TimelineNodeItem } from '../../types';

export interface TimelineProps {
  timeline: TimelineNodeItem[];
}

export const Timeline: React.FC<TimelineProps> = ({ timeline }) => {
  // Ordenar cronológicamente del más antiguo al más reciente (arriba hacia abajo)
  const sortedItems = [...timeline].sort((a, b) => {
    if (a.step_order !== b.step_order) {
      return a.step_order - b.step_order;
    }
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  return (
    <View style={styles.container}>
      {sortedItems.map((item, index) => (
        <TimelineNode
          key={`node-${item.step_order}-${index}`}
          item={item}
          isFirst={index === 0}
          isLast={index === sortedItems.length - 1}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
});
