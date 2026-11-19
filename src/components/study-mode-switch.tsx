import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/icon-button';
import { EditSheetIcon, OpenBookIcon } from '@/components/icons';
import { Spacing } from '@/constants/theme';

export type StudyMode = 'study' | 'edit';

const MODES = [
  { id: 'study', label: 'Estudio', icon: OpenBookIcon },
  { id: 'edit', label: 'Edición', icon: EditSheetIcon },
] as const;

interface StudyModeSwitchProps {
  value: StudyMode;
  onChange: (mode: StudyMode) => void;
}

export function StudyModeSwitch({ value, onChange }: StudyModeSwitchProps) {
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
