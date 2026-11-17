import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ErrorView } from '@/components/error-view';
import { FlashcardItem } from '@/components/flashcard-item';
import { LoadingView } from '@/components/loading-view';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteDeck, getDeck } from '@/services/decks';
import { listFlashcards, unlinkFlashcard } from '@/services/flashcards';
import type { Deck, Flashcard } from '@/types/api';
import { singleParam } from '@/utils/params';
import { requestErrorMessage } from '@/utils/request-feedback';
import { cardFormHref, deckFormHref, studyHref } from '@/utils/routes';

export default function DeckDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const deckId = singleParam(params.id) ?? '';

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingDeck, setDeletingDeck] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const loadDeck = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!deckId) {
        setError('No se encontró el mazo.');
        setLoading(false);
        return;
      }

      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const [nextDeck, nextCards] = await Promise.all([getDeck(deckId), listFlashcards(deckId)]);
        setDeck(nextDeck);
        setCards(nextCards);
        loadedRef.current = true;
        setError(null);
      } catch (requestError) {
        setError(requestErrorMessage(requestError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [deckId],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDeck(loadedRef.current ? 'refresh' : 'initial');
    }, [loadDeck]),
  );

  function confirmDeleteDeck() {
    Alert.alert(
      'Eliminar mazo',
      'Se eliminará el mazo. Sus tarjetas se desvinculan y, si no quedan en otro mazo, podrás buscarlas en Tarjetas sin mazo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void removeDeck() },
      ],
    );
  }

  async function removeDeck() {
    setDeletingDeck(true);
    try {
      await deleteDeck(deckId);
      router.back();
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
      setDeletingDeck(false);
    }
  }

  function confirmUnlinkCard(card: Flashcard) {
    Alert.alert(
      'Quitar del mazo',
      'La tarjeta dejará de pertenecer a este mazo. Si no queda en ningún otro, podrás buscarla en Tarjetas sin mazo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Quitar', style: 'destructive', onPress: () => void removeCard(card.id) },
      ],
    );
  }

  async function removeCard(cardId: string) {
    setDeletingCardId(cardId);
    try {
      await unlinkFlashcard(deckId, cardId);
      await loadDeck('refresh');
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setDeletingCardId(null);
    }
  }

  if (loading && cards === null) {
    return <LoadingView />;
  }

  if (error && cards === null) {
    return <ErrorView message={error} onRetry={() => void loadDeck('initial')} />;
  }

  const tagLine = (deck?.tags ?? []).join(' · ');

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: deck?.name ?? 'Mazo' }} />
      <FlatList
        data={cards ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadDeck('refresh')}
            tintColor={theme.text}
            colors={[theme.text]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {error ? (
              <ThemedView type="backgroundElement" style={styles.banner}>
                <ThemedText>{error}</ThemedText>
                <PrimaryButton
                  label="Reintentar"
                  loading={refreshing}
                  onPress={() => void loadDeck('refresh')}
                />
              </ThemedView>
            ) : null}
            {deck?.description ? <ThemedText>{deck.description}</ThemedText> : null}
            {tagLine ? (
              <ThemedText type="small" themeColor="textSecondary">
                {tagLine}
              </ThemedText>
            ) : null}
            <View style={styles.actions}>
              <PrimaryButton
                label="Estudiar"
                disabled={(cards ?? []).length === 0}
                onPress={() => router.push(studyHref(deckId))}
              />
              <PrimaryButton
                label="Nueva tarjeta"
                variant="secondary"
                onPress={() => router.push(cardFormHref(deckId))}
              />
              <PrimaryButton
                label="Editar mazo"
                variant="secondary"
                onPress={() => router.push(deckFormHref(deckId))}
              />
              <PrimaryButton
                label="Eliminar mazo"
                variant="danger"
                loading={deletingDeck}
                onPress={confirmDeleteDeck}
              />
            </View>
            <ThemedText type="smallBold">Tarjetas</ThemedText>
          </View>
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">Este mazo no tiene tarjetas.</ThemedText>
        }
        renderItem={({ item }) => (
          <FlashcardItem
            card={item}
            deleting={deletingCardId === item.id}
            actionLabel="Quitar"
            onPress={() => router.push(cardFormHref(deckId, item.id))}
            onDelete={() => confirmUnlinkCard(item)}
          />
        )}
      />
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
    marginBottom: Spacing.three,
  },
  actions: {
    gap: Spacing.two,
  },
  banner: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
