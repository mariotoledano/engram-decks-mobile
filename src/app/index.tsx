import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

import { DeckCard } from '@/components/deck-card';
import { ErrorView } from '@/components/error-view';
import { LoadingView } from '@/components/loading-view';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteDeck, listDecks } from '@/services/decks';
import type { Deck } from '@/types/api';
import { requestErrorMessage } from '@/utils/request-feedback';
import { deckHref, maintenanceHref, newSessionHref, unlinkedHref } from '@/utils/routes';

export default function DeckListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const decksRef = useRef<Deck[] | null>(null);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // useFocusEffect runs again when this screen is shown, including after creating a deck.
  const loadDecks = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await listDecks();
      decksRef.current = data;
      setDecks(data);
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

  function confirmDelete(deck: Deck) {
    Alert.alert(
      'Eliminar mazo',
      'Se eliminará el mazo. Sus tarjetas se desvinculan y, si no quedan en otro mazo, podrás buscarlas en Tarjetas sin mazo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void remove(deck.id),
        },
      ],
    );
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      await deleteDeck(id);
      await loadDecks('refresh');
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setDeletingId(null);
    }
  }

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
              <PrimaryButton
                label="Nueva sesión"
                onPress={() => router.push(newSessionHref())}
              />
              <PrimaryButton
                label="Tarjetas sin mazo"
                variant="secondary"
                onPress={() => router.push(unlinkedHref())}
              />
              <PrimaryButton
                label="Mantenimiento"
                variant="secondary"
                onPress={() => router.push(maintenanceHref())}
              />
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
              <ThemedText themeColor="textSecondary">Crea un mazo para empezar.</ThemedText>
            </ThemedView>
          }
          renderItem={({ item }) => (
            <DeckCard
              deck={item}
              deleting={deletingId === item.id}
              onPress={() => router.push(deckHref(item.id))}
              onDelete={() => confirmDelete(item)}
            />
          )}
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
    marginBottom: Spacing.three,
  },
});
