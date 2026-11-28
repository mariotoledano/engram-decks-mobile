import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ErrorView } from '@/components/error-view';
import { HomeBackLink } from '@/components/home-back-link';
import { LoadingView } from '@/components/loading-view';
import { StudyModeSwitch, type StudyMode } from '@/components/study-mode-switch';
import { StudySession } from '@/components/study-session';
import { ThemedView } from '@/components/themed-view';
import { loadFreeStudyDeck } from '@/services/free-study-cache';
import type { Flashcard } from '@/types/api';
import { requestErrorMessage } from '@/utils/request-feedback';

export default function FreeStudySessionScreen() {
  const navigation = useNavigation();
  const [mode, setMode] = useState<StudyMode>('study');
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Estudio libre',
      headerBackVisible: false,
      headerLeft: () => <HomeBackLink />,
      headerRight: () => <StudyModeSwitch value={mode} onChange={setMode} />,
    });
  }, [navigation, mode]);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await loadFreeStudyDeck();
      if (stored === null) {
        setCards(null);
        setMissing(true);
      } else {
        setCards(stored);
        setMissing(false);
      }
      setError(null);
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  useEffect(() => {
    if (missing) {
      router.replace('/free-study');
    }
  }, [missing]);

  if (missing) {
    return (
      <ThemedView style={styles.screen}>
        <LoadingView />
      </ThemedView>
    );
  }

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
