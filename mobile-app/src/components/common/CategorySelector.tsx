import React from 'react';
import { View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Droplet,
  ShieldAlert,
  Waves,
  Home,
  TreePine,
  Filter as FilterIcon,
  Zap,
  Building2,
  PowerOff,
  HelpCircle,
} from 'lucide-react-native';
import { AccessibleText } from './AccessibleText';
import { PressableSurface } from './PressableSurface';
import { useAppTheme } from '../../context/ThemeContext';
import { CATEGORY_LIST, CategoryInfo } from '../../constants/categories';
import { IncidentCategory } from '../../types';

export interface CategorySelectorProps {
  selectedCategory?: IncidentCategory | null;
  onSelectCategory: (category: IncidentCategory) => void;
}

const getCategoryIcon = (iconName: string, color: string) => {
  const props = { size: 24, color, strokeWidth: 2 };
  switch (iconName) {
    case 'Droplet':
      return <Droplet {...props} />;
    case 'ShieldAlert':
      return <ShieldAlert {...props} />;
    case 'Waves':
      return <Waves {...props} />;
    case 'Home':
      return <Home {...props} />;
    case 'TreePine':
      return <TreePine {...props} />;
    case 'Filter':
      return <FilterIcon {...props} />;
    case 'Zap':
      return <Zap {...props} />;
    case 'Building2':
      return <Building2 {...props} />;
    case 'PowerOff':
      return <PowerOff {...props} />;
    case 'HelpCircle':
    default:
      return <HelpCircle {...props} />;
  }
};

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const { colors, radius } = useAppTheme();

  const handlePress = (cat: CategoryInfo) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Haptics no soportado en plataforma
    }
    onSelectCategory(cat.key);
  };

  return (
    <View style={styles.grid}>
      {CATEGORY_LIST.map((cat) => {
        const isSelected = selectedCategory === cat.key;

        return (
          <PressableSurface
            key={cat.key}
            style={[
              styles.card,
              {
                backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
                borderRadius: radius.card,
              },
            ]}
            onPress={() => handlePress(cat)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={cat.label}
          >
            <View style={styles.iconWrapper}>
              {getCategoryIcon(cat.iconName, cat.color)}
            </View>
            <AccessibleText
              variant="label"
              weight={isSelected ? 'semibold' : 'medium'}
              style={[
                styles.categoryText,
                { color: isSelected ? colors.primaryDark : colors.textMain },
              ]}
            >
              {cat.label}
            </AccessibleText>
            <View style={[styles.colorBar, { backgroundColor: cat.color }]} />
          </PressableSurface>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '48%',
    minHeight: 80, // Área de toque accesible (> 56dp)
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  iconWrapper: {
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 13,
    lineHeight: 18,
  },
  colorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
});
