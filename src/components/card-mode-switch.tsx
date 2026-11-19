import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/icon-button';
import { EditSheetIcon, SearchIcon } from '@/components/icons';
import { Spacing } from '@/constants/theme';

export type CardMode = 'search' | 'edit';

const MODES = [
  { id: 'search', label: 'Búsqueda de tarjetas', icon: SearchIcon },
  { id: 'edit', label: 'Edición de tarjetas', icon: EditSheetIcon },
] as const;

interface CardModeSwitchProps {
  value: CardMode;
  onChange: (mode: CardMode) => void;
}

export function CardModeSwitch({ value, onChange }: CardModeSwitchProps) {
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
