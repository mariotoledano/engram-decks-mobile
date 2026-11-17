import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { deckFormHref } from '@/utils/routes';

export function NewDeckButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(deckFormHref())}
      style={styles.headerButton}>
      <ThemedText type="smallBold">Nuevo</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
