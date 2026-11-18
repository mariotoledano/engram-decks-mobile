import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { DeckCard } from '@/components/deck-card';
import { DeckModeSwitch, type DeckMode } from '@/components/deck-mode-switch';
import { ErrorView } from '@/components/error-view';
import { LoadingView } from '@/components/loading-view';
import { SCROLL_TOP_OFFSET, ScrollToTopButton } from '@/components/scroll-to-top-button';
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
  const listRef = useRef<FlatList<Deck>>(null);
  const decksRef = useRef<Deck[] | null>(null);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
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

  const onListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const visible = event.nativeEvent.contentOffset.y > SCROLL_TOP_OFFSET;
    setShowScrollTop((current) => (current === visible ? current : visible));
  }, []);

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const listHeader =
    searching || error ? (
      <ThemedView style={styles.header}>
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
    ) : null;

  return (
    <ThemedView style={styles.screen}>
      {loading && decks === null ? (
        <LoadingView />
      ) : error && decks === null ? (
        <ErrorView message={error} onRetry={() => void loadDecks('initial')} />
      ) : (
        <>
          <ThemedView style={styles.pinned}>
            <DeckSearchBar value={query} onChange={setQuery} />
          </ThemedView>
          <FlatList
            ref={listRef}
            style={styles.listFlex}
            data={visibleDecks}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            scrollEventThrottle={16}
            onScroll={onListScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadDecks('refresh')}
                tintColor={theme.text}
                colors={[theme.text]}
              />
            }
            ListHeaderComponent={listHeader ?? undefined}
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
          {showScrollTop ? <ScrollToTopButton onPress={scrollToTop} /> : null}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  pinned: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
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
