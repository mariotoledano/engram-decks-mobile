import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { DeckCard } from '@/components/deck-card';
import { ErrorView } from '@/components/error-view';
import { LoadingView } from '@/components/loading-view';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listDecks } from '@/services/decks';
import { clearFreeStudyDeck, loadFreeStudyDeck } from '@/services/free-study-cache';
import type { Deck } from '@/types/api';
import { compareDecksByRecentStudy, studyDeckHref } from '@/utils/decks';
import { requestErrorMessage } from '@/utils/request-feedback';

export default function HomeScreen() {
  const theme = useTheme();
  const decksRef = useRef<Deck[] | null>(null);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumePrompt, setResumePrompt] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const loadDecks = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await listDecks();
      const sorted = [...data].sort(compareDecksByRecentStudy);
      decksRef.current = sorted;
      setDecks(sorted);
      setError(null);
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDecks(decksRef.current === null ? 'initial' : 'refresh');
    }, [loadDecks]),
  );

  const openFreeStudy = useCallback(() => {
    void (async () => {
      const cached = await loadFreeStudyDeck();
      if (cached === null) {
        router.push('/free-study');
        return;
      }
      setResumeError(null);
      setResumePrompt(true);
    })();
  }, []);

  const resumeCachedStudy = useCallback(() => {
    setResumePrompt(false);
    router.push('/study/free');
  }, []);

  const startFreshFreeStudy = useCallback(() => {
    void clearFreeStudyDeck()
      .then(() => {
        setResumePrompt(false);
        router.push('/free-study');
      })
      .catch(() => {
        setResumeError('No se pudo borrar la sesión guardada.');
      });
  }, []);

  return (
    <ThemedView style={styles.screen}>
      {loading && decks === null ? (
        <LoadingView />
      ) : error && decks === null ? (
        <ErrorView message={error} onRetry={() => void loadDecks('initial')} />
      ) : (
        <FlatList
          data={decks ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadDecks('refresh')}
              tintColor={theme.text}
              colors={[theme.text]}
            />
          }
          ListHeaderComponent={
            <ThemedView style={styles.header}>
              <PrimaryButton label="Mazos" onPress={() => router.push('/decks')} />
              <PrimaryButton label="Tarjetas" onPress={() => router.push('/cards' as Href)} />
              <PrimaryButton label="Estudio libre" onPress={openFreeStudy} />
              <ThemedText type="smallBold">Recientes</ThemedText>
              {error ? (
                <ThemedView type="backgroundElement" style={styles.banner}>
                  <ThemedText>{error}</ThemedText>
                  <Pressable accessibilityRole="button" onPress={() => void loadDecks('refresh')}>
                    <ThemedText type="linkPrimary">Reintentar</ThemedText>
                  </Pressable>
                </ThemedView>
              ) : null}
            </ThemedView>
          }
          ListEmptyComponent={
            <ThemedView style={styles.empty}>
              <ThemedText type="smallBold">No hay mazos</ThemedText>
              <ThemedText themeColor="textSecondary">Cuando haya mazos, aparecerán aquí.</ThemedText>
            </ThemedView>
          }
          renderItem={({ item }) => <DeckCard deck={item} href={studyDeckHref(item)} />}
        />
      )}
      {resumePrompt ? (
        <View style={styles.promptBackdrop}>
          <ThemedView type="backgroundElement" style={styles.promptCard}>
            <ThemedText type="smallBold">Estudio libre</ThemedText>
            <ThemedText>¿Quieres empezar una sesión de estudio libre nueva?</ThemedText>
            {resumeError ? <ThemedText themeColor="danger">{resumeError}</ThemedText> : null}
            <PrimaryButton label="No" variant="secondary" onPress={resumeCachedStudy} />
            <PrimaryButton label="Sí" onPress={startFreshFreeStudy} />
          </ThemedView>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
    flexGrow: 1,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  empty: {
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  banner: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  promptBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(20, 18, 16, 0.45)',
  },
  promptCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
