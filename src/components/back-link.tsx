import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ArrowLeftIcon } from '@/components/icons';
import { HeaderBackIconSize } from '@/constants/theme';
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
      <ArrowLeftIcon color={theme.text} size={HeaderBackIconSize} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  web: {
    cursor: 'pointer',
  },
});
