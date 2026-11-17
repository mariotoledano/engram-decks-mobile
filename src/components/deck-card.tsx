import { Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Deck } from '@/types/api';

interface DeckCardProps {
  deck: Deck;
  onPress: () => void;
  onDelete: () => void;
  deleting: boolean;
}

export function DeckCard({ deck, onPress, onDelete, deleting }: DeckCardProps) {
  const tags = deck.tags ?? [];

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {deck.name}
        </ThemedText>
        {deck.description ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {deck.description}
          </ThemedText>
        ) : null}
        {tags.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {tags.join(' · ')}
          </ThemedText>
        ) : null}
      </Pressable>
      <View style={styles.actions}>
        <PrimaryButton label="Eliminar" variant="danger" loading={deleting} onPress={onDelete} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  body: {
    gap: Spacing.one,
  },
  actions: {
    alignItems: 'flex-start',
  },
});
