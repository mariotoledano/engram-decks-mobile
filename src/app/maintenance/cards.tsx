import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet } from 'react-native';

import { ErrorView } from '@/components/error-view';
import { FlashcardItem } from '@/components/flashcard-item';
import { LoadingView } from '@/components/loading-view';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listMaintenanceFlashcards } from '@/services/maintenance';
import { deleteFlashcard } from '@/services/flashcards';
import type { Flashcard } from '@/types/api';
import { requestErrorMessage } from '@/utils/request-feedback';
import { cardEditHref } from '@/utils/routes';

export default function MaintenanceCardsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCards = useCallback(async (nextQuery: string, nextTag: string) => {
    try {
      setCards(await listMaintenanceFlashcards(nextQuery, nextTag));
      setError(null);
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const handle = setTimeout(() => {
        void loadCards(query, tag);
      }, 300);
      return () => clearTimeout(handle);
    }, [loadCards, query, tag]),
  );

  function confirmDelete(card: Flashcard) {
    Alert.alert('Eliminar tarjeta', 'Se eliminará la tarjeta de la base de datos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setDeletingId(card.id);
          void deleteFlashcard(card.id)
            .then(() => loadCards(query, tag))
            .catch((requestError: unknown) => setError(requestErrorMessage(requestError)))
            .finally(() => setDeletingId(null));
        },
      },
    ]);
  }

  if (loading && cards === null) {
    return <LoadingView />;
  }

  if (error && cards === null) {
    return <ErrorView message={error} onRetry={() => void loadCards(query, tag)} />;
  }

  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={cards ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <ThemedView style={styles.header}>
            <TextField label="Buscar" value={query} onChangeText={setQuery} placeholder="Anverso o reverso" />
            <TextField label="Etiqueta" value={tag} onChangeText={setTag} placeholder="Opcional" />
            {error ? <ThemedText style={{ color: theme.danger }}>{error}</ThemedText> : null}
          </ThemedView>
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">Ninguna tarjeta coincide.</ThemedText>
        }
        renderItem={({ item }) => (
          <FlashcardItem
            card={item}
            deleting={deletingId === item.id}
            onPress={() => router.push(cardEditHref(item.id))}
            onDelete={() => confirmDelete(item)}
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
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
});
