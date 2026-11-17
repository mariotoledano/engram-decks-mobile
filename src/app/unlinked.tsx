import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { ErrorView } from '@/components/error-view';
import { FlashcardItem } from '@/components/flashcard-item';
import { LoadingView } from '@/components/loading-view';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listUnlinkedFlashcards } from '@/services/flashcards';
import type { Flashcard } from '@/types/api';
import { requestErrorMessage } from '@/utils/request-feedback';
import { cardEditHref } from '@/utils/routes';

export default function UnlinkedScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCards = useCallback(async (text: string) => {
    try {
      const data = await listUnlinkedFlashcards(text);
      setCards(data);
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
        void loadCards(query);
      }, 300);
      return () => clearTimeout(handle);
    }, [loadCards, query]),
  );

  if (loading && cards === null) {
    return <LoadingView />;
  }

  if (error && cards === null) {
    return <ErrorView message={error} onRetry={() => void loadCards(query)} />;
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
            <TextField
              label="Buscar"
              value={query}
              onChangeText={setQuery}
              placeholder="Anverso o reverso"
            />
            {error ? <ThemedText style={{ color: theme.danger }}>{error}</ThemedText> : null}
          </ThemedView>
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">
            {query.trim() ? 'Ninguna tarjeta sin mazo coincide con la búsqueda.' : 'No hay tarjetas sin mazo.'}
          </ThemedText>
        }
        renderItem={({ item }) => (
          <FlashcardItem card={item} onPress={() => router.push(cardEditHref(item.id))} />
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
