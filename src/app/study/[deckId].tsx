import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ErrorView } from '@/components/error-view';
import { LoadingView } from '@/components/loading-view';
import { StudyModeSwitch, type StudyMode } from '@/components/study-mode-switch';
import { StudySession } from '@/components/study-session';
import { ThemedView } from '@/components/themed-view';
import { listFlashcardsByDeck } from '@/services/flashcards';
import type { Flashcard } from '@/types/api';
import { shuffleFlashcards } from '@/utils/flashcards';
import { requestErrorMessage } from '@/utils/request-feedback';

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function StudyScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ deckId: string; name?: string }>();
  const deckId = routeParam(params.deckId);
  const deckName = routeParam(params.name);
  const [mode, setMode] = useState<StudyMode>('study');
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: deckName.length > 0 ? deckName : 'Estudio',
      headerRight: () => <StudyModeSwitch value={mode} onChange={setMode} />,
    });
  }, [navigation, deckName, mode]);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFlashcardsByDeck(deckId);
      setCards(shuffleFlashcards(data));
      setError(null);
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  return (
    <ThemedView style={styles.screen}>
      {loading && cards === null ? (
        <LoadingView />
      ) : error && cards === null ? (
        <ErrorView message={error} onRetry={() => void loadCards()} />
      ) : cards ? (
        <StudySession cards={cards} emptyMessage="Este mazo no tiene tarjetas" />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
