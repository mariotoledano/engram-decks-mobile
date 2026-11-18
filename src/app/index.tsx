import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

import { DeckCard } from '@/components/deck-card';
import { ErrorView } from '@/components/error-view';
import { LoadingView } from '@/components/loading-view';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listDecks } from '@/services/decks';
import type { Deck } from '@/types/api';
import { compareDecksByRecentStudy } from '@/utils/decks';
import { requestErrorMessage } from '@/utils/request-feedback';

export default function HomeScreen() {
  const theme = useTheme();
  const decksRef = useRef<Deck[] | null>(null);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              <PrimaryButton label="Tarjetas" />
              <PrimaryButton label="Estudio libre" />
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
          renderItem={({ item }) => <DeckCard deck={item} />}
        />
      )}
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
});
