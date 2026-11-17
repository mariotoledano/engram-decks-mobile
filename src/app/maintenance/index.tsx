import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorView } from '@/components/error-view';
import { LoadingView } from '@/components/loading-view';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteAllDecks,
  deleteAllFlashcards,
  deleteUnlinkedFlashcards,
  getMaintenanceSummary,
} from '@/services/maintenance';
import type { MaintenanceSummary } from '@/types/api';
import { requestErrorMessage } from '@/utils/request-feedback';
import { maintenanceCardsHref } from '@/utils/routes';

export default function MaintenanceScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await getMaintenanceSummary());
      setError(null);
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary]),
  );

  function confirmWipe(title: string, message: string, action: () => Promise<void>, key: string) {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          setBusy(key);
          void action()
            .then(() => loadSummary())
            .catch((requestError: unknown) => setError(requestErrorMessage(requestError)))
            .finally(() => setBusy(null));
        },
      },
    ]);
  }

  if (loading && summary === null) {
    return <LoadingView />;
  }

  if (error && summary === null) {
    return <ErrorView message={error} onRetry={() => void loadSummary()} />;
  }

  const counts = summary ?? { deckCount: 0, flashcardCount: 0, unlinkedCount: 0, tagCount: 0 };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <ThemedView type="backgroundElement" style={styles.summary}>
          <ThemedText>Mazos: {counts.deckCount}</ThemedText>
          <ThemedText>Tarjetas: {counts.flashcardCount}</ThemedText>
          <ThemedText>Sin mazo: {counts.unlinkedCount}</ThemedText>
          <ThemedText>Etiquetas: {counts.tagCount}</ThemedText>
        </ThemedView>
        {error ? <ThemedText style={{ color: theme.danger }}>{error}</ThemedText> : null}
        <PrimaryButton label="Ver tarjetas" onPress={() => router.push(maintenanceCardsHref())} />
        <PrimaryButton
          label="Borrar mazos"
          variant="danger"
          loading={busy === 'decks'}
          onPress={() =>
            confirmWipe(
              'Borrar mazos',
              'Se borran todos los mazos. Las tarjetas se desvinculan y siguen en la base de datos.',
              deleteAllDecks,
              'decks',
            )
          }
        />
        <PrimaryButton
          label="Borrar tarjetas sin mazo"
          variant="danger"
          loading={busy === 'unlinked'}
          onPress={() =>
            confirmWipe(
              'Borrar tarjetas sin mazo',
              'Se borran solo las tarjetas que no pertenecen a ningún mazo.',
              deleteUnlinkedFlashcards,
              'unlinked',
            )
          }
        />
        <PrimaryButton
          label="Borrar todas las tarjetas"
          variant="danger"
          loading={busy === 'cards'}
          onPress={() =>
            confirmWipe(
              'Borrar todas las tarjetas',
              'Se borran todas las tarjetas. Los mazos se quedan vacíos.',
              deleteAllFlashcards,
              'cards',
            )
          }
        />
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
    padding: Spacing.three,
    gap: Spacing.three,
  },
  summary: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
