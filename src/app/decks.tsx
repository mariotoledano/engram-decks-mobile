import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput } from 'react-native';

import { DeckCard } from '@/components/deck-card';
import { DeckModeSwitch, type DeckMode } from '@/components/deck-mode-switch';
import { ErrorView } from '@/components/error-view';
import { LoadingView } from '@/components/loading-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listDecks } from '@/services/decks';
import type { Deck } from '@/types/api';
import { normalizeSearchText, searchDecks } from '@/utils/decks';
import { requestErrorMessage } from '@/utils/request-feedback';

function resultLabel(count: number): string {
  return count === 1 ? '1 mazo' : `${count} mazos`;
}

interface DeckSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

function DeckSearchBar({ value, onChange }: DeckSearchBarProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.searchRow, { borderColor: theme.line }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Buscar mazos"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Buscar mazos"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, { color: theme.text }]}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          onPress={() => onChange('')}
          hitSlop={Spacing.two}
          style={styles.clear}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ×
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

export default function DecksScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const decksRef = useRef<Deck[] | null>(null);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<DeckMode>('study');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searching = normalizeSearchText(query).length > 0;
  const visibleDecks = useMemo(() => (decks === null ? [] : searchDecks(decks, query)), [decks, query]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <DeckModeSwitch value={mode} onChange={setMode} />,
      headerRightContainerStyle: { paddingRight: Spacing.three },
    });
  }, [navigation, mode]);

  const loadDecks = useCallback(async (loadMode: 'initial' | 'refresh') => {
    if (loadMode === 'initial') {
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

  return (
    <ThemedView style={styles.screen}>
      {loading && decks === null ? (
        <LoadingView />
      ) : error && decks === null ? (
        <ErrorView message={error} onRetry={() => void loadDecks('initial')} />
      ) : (
        <FlatList
          data={visibleDecks}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
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
              <DeckSearchBar value={query} onChange={setQuery} />
              {searching ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {resultLabel(visibleDecks.length)}
                </ThemedText>
              ) : null}
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
              {searching ? (
                <ThemedText type="smallBold">Ningún mazo coincide con la búsqueda</ThemedText>
              ) : (
                <>
                  <ThemedText type="smallBold">No hay mazos</ThemedText>
                  <ThemedText themeColor="textSecondary">Cuando haya mazos, aparecerán aquí.</ThemedText>
                </>
              )}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingLeft: Spacing.three,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: Spacing.two,
  },
  clear: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
