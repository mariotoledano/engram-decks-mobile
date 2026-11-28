import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/icon-button';
import { BulletListIcon, EditSheetIcon, OpenBookIcon, SearchIcon } from '@/components/icons';
import { Spacing } from '@/constants/theme';

export type DeckMode = 'study' | 'search' | 'edit' | 'list';

const MODES = [
  { id: 'study', label: 'Estudio de mazos', icon: OpenBookIcon },
  { id: 'search', label: 'Búsqueda de mazos', icon: SearchIcon },
  { id: 'edit', label: 'Edición de mazos', icon: EditSheetIcon },
  { id: 'list', label: 'Edición de lista', icon: BulletListIcon },
] as const;

interface DeckModeSwitchProps {
  value: DeckMode;
  onChange: (mode: DeckMode) => void;
}

export function DeckModeSwitch({ value, onChange }: DeckModeSwitchProps) {
  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {MODES.map((mode) => (
        <IconButton
          key={mode.id}
          icon={mode.icon}
          accessibilityLabel={mode.label}
          accessibilityRole="tab"
          selected={value === mode.id}
          onPress={() => onChange(mode.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
