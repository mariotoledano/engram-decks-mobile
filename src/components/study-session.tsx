import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeckIcon } from '@/components/icons';
import { StudyCard } from '@/components/study-card';
import { StudyFinishedCard } from '@/components/study-finished-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Flashcard } from '@/types/api';
import { shuffleFlashcards } from '@/utils/flashcards';

interface StudySessionProps {
  cards: Flashcard[];
  emptyMessage: string;
}

export function StudySession({ cards, emptyMessage }: StudySessionProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const countRef = useRef(cards.length);
  const sourceRef = useRef(cards);
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [sessionCards, setSessionCards] = useState(cards);

  useEffect(() => {
    if (sourceRef.current === cards) {
      return;
    }
    sourceRef.current = cards;
    countRef.current = cards.length;
    setSessionCards(cards);
    setIndex(0);
    setRound((current) => current + 1);
  }, [cards]);

  const goPrevious = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((current) => Math.min(countRef.current, current + 1));
  }, []);

  const repeat = useCallback(() => {
    setSessionCards((current) => {
      const shuffled = shuffleFlashcards(current);
      countRef.current = shuffled.length;
      return shuffled;
    });
    setRound((current) => current + 1);
    setIndex(0);
  }, []);

  const leave = useCallback(() => {
    router.dismissTo('/');
  }, []);

  const total = sessionCards.length;
  const finished = total > 0 && index >= total;
  const card = finished ? undefined : sessionCards[index];

  return (
    <ThemedView style={styles.screen}>
      {finished ? (
        <View style={[styles.stage, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
          <StudyFinishedCard onRepeat={repeat} onBack={leave} onPrevious={goPrevious} />
        </View>
      ) : card ? (
        <>
          <View style={styles.playStage}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tarjeta anterior"
              disabled={index === 0}
              onPress={goPrevious}
              style={styles.edge}
            />
            <StudyCard
              key={`${round}-${card.id}`}
              card={card}
              canGoPrevious={index > 0}
              canGoNext={index < total}
              onPrevious={goPrevious}
              onNext={goNext}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tarjeta siguiente"
              disabled={index >= total}
              onPress={goNext}
              style={styles.edge}
            />
          </View>
          <View
            accessible
            accessibilityLabel={`Tarjeta ${index + 1} de ${total}`}
            style={[styles.countRow, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {index + 1}/{total}
            </ThemedText>
            <DeckIcon color={theme.textSecondary} size={14} />
          </View>
        </>
      ) : (
        <ThemedView style={styles.empty}>
          <ThemedText type="smallBold">{emptyMessage}</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  stage: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  playStage: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  edge: {
    width: 44,
  },
  countRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
});
