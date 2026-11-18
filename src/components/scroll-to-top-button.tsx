import { Pressable, StyleSheet } from 'react-native';

import { ArrowUpIcon } from '@/components/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const SCROLL_TOP_OFFSET = 96;

interface ScrollToTopButtonProps {
  onPress: () => void;
}

export function ScrollToTopButton({ onPress }: ScrollToTopButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver arriba"
      onPress={onPress}
      style={[styles.button, { backgroundColor: `${theme.accent}99` }]}>
      <ArrowUpIcon color={theme.onAccent} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.four,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
