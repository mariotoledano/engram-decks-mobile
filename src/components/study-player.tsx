import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import type { Flashcard } from '@/types/api';

interface StudyPlayerProps {
  cards: Flashcard[];
  emptyMessage?: string;
}

export function StudyPlayer({
  cards,
  emptyMessage = 'No hay tarjetas para estudiar.',
}: StudyPlayerProps) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(cards.length - 1, 0)));
  }, [cards.length]);

  if (cards.length === 0) {
    return (
      <ThemedView style={styles.empty}>
        <ThemedText style={styles.emptyText}>{emptyMessage}</ThemedText>
      </ThemedView>
    );
  }

  const card = cards[Math.min(index, cards.length - 1)];
  const atStart = index === 0;
  const atEnd = index === cards.length - 1;

  function showPrevious() {
    setRevealed(false);
    setIndex((current) => Math.max(0, current - 1));
  }

  function showNext() {
    setRevealed(false);
    setIndex((current) => Math.min(cards.length - 1, current + 1));
  }

  function restart() {
    setRevealed(false);
    setIndex(0);
  }

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <ThemedText type="smallBold">
          {Math.min(index, cards.length - 1) + 1} / {cards.length}
        </ThemedText>
        <Pressable accessibilityRole="button" onPress={() => setRevealed((current) => !current)}>
          <ThemedView type="backgroundSelected" style={styles.face}>
            <ThemedText type="small" themeColor="textSecondary">
              {revealed ? 'Reverso' : 'Anverso'}
            </ThemedText>
            <ThemedText style={styles.faceText}>{revealed ? card.back : card.front}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {revealed ? 'Toca para volver al anverso' : 'Toca para ver la respuesta'}
            </ThemedText>
          </ThemedView>
        </Pressable>
        {revealed && atEnd ? (
          <ThemedText themeColor="textSecondary">Has llegado al final.</ThemedText>
        ) : null}
        <View style={styles.actions}>
          <PrimaryButton label="Anterior" variant="secondary" disabled={atStart} onPress={showPrevious} />
          <PrimaryButton label="Siguiente" variant="secondary" disabled={atEnd} onPress={showNext} />
          <PrimaryButton label="Reiniciar" variant="secondary" onPress={restart} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexGrow: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  face: {
    minHeight: 240,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  faceText: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    lineHeight: 30,
  },
  actions: {
    gap: Spacing.two,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
});
