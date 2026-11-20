import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ArrowLeftIcon } from '@/components/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function BackLink() {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      hitSlop={8}
      onPress={() => router.back()}
      style={[styles.button, Platform.OS === 'web' ? styles.web : null]}>
      <ArrowLeftIcon color={theme.text} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    marginLeft: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  web: {
    cursor: 'pointer',
  },
});
