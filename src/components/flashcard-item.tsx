import { Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Flashcard } from '@/types/api';

interface FlashcardItemProps {
  card: Flashcard;
  onPress: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  actionLabel?: string;
}

export function FlashcardItem({
  card,
  onPress,
  onDelete,
  deleting = false,
  actionLabel = 'Eliminar',
}: FlashcardItemProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.body}>
        <ThemedText type="small" themeColor="textSecondary">
          Anverso
        </ThemedText>
        <ThemedText numberOfLines={3}>{card.front}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Reverso
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {card.back}
        </ThemedText>
        {(card.tags ?? []).length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {(card.tags ?? []).join(' · ')}
          </ThemedText>
        ) : null}
      </Pressable>
      {onDelete ? (
        <View style={styles.actions}>
          <PrimaryButton label={actionLabel} variant="danger" loading={deleting} onPress={onDelete} />
        </View>
      ) : null}
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
