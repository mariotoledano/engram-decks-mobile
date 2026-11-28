import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Sombra cálida para que la pieza seleccionada se separe un poco del papel. */
export const selectedLift: ViewStyle = Platform.select({
  web: {
    boxShadow: '0 10px 24px rgba(30, 26, 22, 0.16)',
  },
  ios: {
    shadowColor: '#1E1A16',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  default: {
    shadowColor: '#1E1A16',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
}) ?? {};

export function SelectionChrome() {
  const theme = useTheme();

  return <View pointerEvents="none" style={[styles.outline, { borderColor: theme.accent }]} />;
}

const styles = StyleSheet.create({
  outline: {
    ...StyleSheet.absoluteFill,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
});
