import { router, useFocusEffect, useNavigation, type Href } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { CardModeSwitch, type CardMode } from '@/components/card-mode-switch';
import { ErrorView } from '@/components/error-view';
import { FilterChipBox, type FilterChip } from '@/components/filter-chip-box';
import { FlashcardRow } from '@/components/flashcard-row';
import { ChevronDownIcon, DeckIcon, TagIcon } from '@/components/icons';
import { LoadingView } from '@/components/loading-view';
import { SCROLL_TOP_OFFSET, ScrollToTopButton } from '@/components/scroll-to-top-button';
import { SearchField } from '@/components/search-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listDecks } from '@/services/decks';
import { listFlashcards } from '@/services/flashcards';
import { listTags } from '@/services/tags';
import type { Deck, Flashcard } from '@/types/api';
import { filterDecksByName, normalizeSearchText } from '@/utils/decks';
import {
  filterFlashcardsByDecks,
  filterFlashcardsByTags,
  filterTagNames,
  searchFlashcards,
  tagKey,
} from '@/utils/flashcards';
import { requestErrorMessage } from '@/utils/request-feedback';

const SOURCE_CHIP_BOX_HEIGHT = 64;

function resultLabel(count: number): string {
  return count === 1 ? '1 tarjeta' : `${count} tarjetas`;
}

function filterSelectionLabel(tagCount: number, deckCount: number): string | null {
  const parts: string[] = [];
  if (tagCount === 1) {
    parts.push('1 etiqueta');
  } else if (tagCount > 1) {
    parts.push(`${tagCount} etiquetas`);
  }
  if (deckCount === 1) {
    parts.push('1 mazo');
  } else if (deckCount > 1) {
    parts.push(`${deckCount} mazos`);
  }
  return parts.length === 0 ? null : parts.join(' · ');
}

export default function CardsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const listRef = useRef<FlatList<Flashcard>>(null);
  const cardsRef = useRef<Flashcard[] | null>(null);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [tags, setTags] = useState<string[] | null>(null);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDecks, setSelectedDecks] = useState<Deck[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mode, setMode] = useState<CardMode>('search');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [decksError, setDecksError] = useState<string | null>(null);
  const searching = normalizeSearchText(query).length > 0;
  const filtering = searching || selectedTags.length > 0 || selectedDecks.length > 0;
  const matchingTags = useMemo(() => filterTagNames(tags ?? [], query), [tags, query]);
  const selectedTagKeys = useMemo(() => new Set(selectedTags.map(tagKey)), [selectedTags]);
  const visibleTags = useMemo(() => {
    const rest = matchingTags.filter((tag) => !selectedTagKeys.has(tagKey(tag)));
    return [...selectedTags, ...rest];
  }, [matchingTags, selectedTagKeys, selectedTags]);
  const matchingDecks = useMemo(() => filterDecksByName(decks ?? [], query), [decks, query]);
  const selectedDeckIds = useMemo(() => new Set(selectedDecks.map((deck) => deck.id)), [selectedDecks]);
  const visibleDecks = useMemo(() => {
    const selected = selectedDecks.map((deck) => decks?.find((item) => item.id === deck.id) ?? deck);
    const rest = matchingDecks.filter((deck) => !selectedDeckIds.has(deck.id));
    return [...selected, ...rest];
  }, [decks, matchingDecks, selectedDeckIds, selectedDecks]);
  const visibleCards = useMemo(() => {
    if (cards === null) {
      return [];
    }
    const byText = searchFlashcards(cards, query);
    const byTags = filterFlashcardsByTags(byText, selectedTags);
    return filterFlashcardsByDecks(
      byTags,
      selectedDecks.map((deck) => deck.id),
    );
  }, [cards, query, selectedDecks, selectedTags]);
  const filterSelection = filterSelectionLabel(selectedTags.length, selectedDecks.length);
  const catalogsEmpty = tags !== null && decks !== null && tags.length === 0 && decks.length === 0;
  const sourceEmptyLabel = catalogsEmpty ? 'No hay etiquetas ni mazos' : 'Nada coincide con la búsqueda';
  const sourceError = tags === null ? tagsError : decks === null ? decksError : null;
  const sourceChips = useMemo<FilterChip[]>(() => {
    const tagsFirst = [
      ...visibleTags.map((tag) => ({
        key: `tag:${tagKey(tag)}`,
        label: tag,
        selected: selectedTagKeys.has(tagKey(tag)),
        accessibilityLabel: `Etiqueta ${tag}`,
        Icon: TagIcon,
      })),
      ...visibleDecks.map((deck) => ({
        key: `deck:${deck.id}`,
        label: deck.name,
        selected: selectedDeckIds.has(deck.id),
        accessibilityLabel: `Mazo ${deck.name}`,
        Icon: DeckIcon,
      })),
    ];
    return [...tagsFirst.filter((chip) => chip.selected), ...tagsFirst.filter((chip) => !chip.selected)];
  }, [selectedDeckIds, selectedTagKeys, visibleDecks, visibleTags]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <CardModeSwitch value={mode} onChange={setMode} />,
      headerRightContainerStyle: { paddingRight: Spacing.three },
    });
  }, [navigation, mode]);

  const loadCards = useCallback(async (loadMode: 'initial' | 'refresh') => {
    if (loadMode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [cardsResult, tagsResult, decksResult] = await Promise.allSettled([
        listFlashcards(),
        listTags(),
        listDecks(),
      ]);
      if (cardsResult.status === 'fulfilled') {
        cardsRef.current = cardsResult.value;
        setCards(cardsResult.value);
        setError(null);
      } else {
        setError(requestErrorMessage(cardsResult.reason));
      }
      if (tagsResult.status === 'fulfilled') {
        const nextTags = tagsResult.value;
        const available = new Set(nextTags.map(tagKey));
        setTags(nextTags);
        setTagsError(null);
        setSelectedTags((current) => current.filter((tag) => available.has(tagKey(tag))));
      } else {
        setTagsError(requestErrorMessage(tagsResult.reason));
      }
      if (decksResult.status === 'fulfilled') {
        const nextDecks = decksResult.value;
        setDecks(nextDecks);
        setDecksError(null);
        setSelectedDecks((current) =>
          current.flatMap((deck) => {
            const fresh = nextDecks.find((item) => item.id === deck.id);
            return fresh ? [fresh] : [];
          }),
        );
      } else {
        setDecksError(requestErrorMessage(decksResult.reason));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCards(cardsRef.current === null ? 'initial' : 'refresh');
    }, [loadCards]),
  );

  const onListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const visible = event.nativeEvent.contentOffset.y > SCROLL_TOP_OFFSET;
    setShowScrollTop((current) => (current === visible ? current : visible));
  }, []);

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const toggleTag = useCallback(
    (key: string) => {
      const tag = visibleTags.find((item) => tagKey(item) === key);
      if (!tag) {
        return;
      }
      setSelectedTags((current) => {
        if (current.some((item) => tagKey(item) === key)) {
          return current.filter((item) => tagKey(item) !== key);
        }
        return [tag, ...current];
      });
    },
    [visibleTags],
  );

  const toggleDeck = useCallback(
    (id: string) => {
      const deck = visibleDecks.find((item) => item.id === id);
      if (!deck) {
        return;
      }
      setSelectedDecks((current) => {
        if (current.some((item) => item.id === id)) {
          return current.filter((item) => item.id !== id);
        }
        return [deck, ...current];
      });
    },
    [visibleDecks],
  );

  const toggleSource = useCallback(
    (key: string) => {
      if (key.startsWith('tag:')) {
        toggleTag(key.slice(4));
        return;
      }
      if (key.startsWith('deck:')) {
        toggleDeck(key.slice(5));
      }
    },
    [toggleDeck, toggleTag],
  );

  const retry = useCallback(() => {
    void loadCards(cardsRef.current === null ? 'initial' : 'refresh');
  }, [loadCards]);

  const listHeader =
    filtering || error ? (
      <ThemedView style={styles.header}>
        {filtering ? (
          <ThemedText type="small" themeColor="textSecondary">
            {resultLabel(visibleCards.length)}
          </ThemedText>
        ) : null}
        {error ? (
          <ThemedView type="backgroundElement" style={styles.banner}>
            <ThemedText>{error}</ThemedText>
            <Pressable accessibilityRole="button" onPress={retry}>
              <ThemedText type="linkPrimary">Reintentar</ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}
      </ThemedView>
    ) : null;

  return (
    <ThemedView style={styles.screen}>
      {loading && cards === null ? (
        <LoadingView />
      ) : error && cards === null ? (
        <ErrorView message={error} onRetry={retry} />
      ) : (
        <>
          <ThemedView style={styles.pinned}>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Buscar tarjetas"
              accessibilityLabel="Buscar tarjetas"
              clearLabel="Borrar búsqueda de tarjetas"
            />
            <View style={styles.filterGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: filtersOpen }}
                accessibilityLabel="Etiquetas y mazos"
                onPress={() => setFiltersOpen((open) => !open)}
                style={[styles.filterToggle, Platform.OS === 'web' ? styles.webPointer : null]}>
                <View style={{ transform: [{ rotate: filtersOpen ? '180deg' : '0deg' }] }}>
                  <ChevronDownIcon color={theme.textSecondary} size={18} />
                </View>
                <ThemedText type="smallBold" style={styles.filterTitle}>
                  Etiquetas y mazos
                </ThemedText>
                {!filtersOpen && filterSelection ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {filterSelection}
                  </ThemedText>
                ) : null}
              </Pressable>
              {filtersOpen ? (
                <FilterChipBox
                  chips={sourceChips}
                  Icon={TagIcon}
                  emptyLabel={sourceEmptyLabel}
                  error={sourceChips.length === 0 ? sourceError : null}
                  height={SOURCE_CHIP_BOX_HEIGHT}
                  onPress={toggleSource}
                  onRetry={retry}
                />
              ) : null}
            </View>
          </ThemedView>
          <FlatList
            ref={listRef}
            style={styles.listFlex}
            data={visibleCards}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            scrollEventThrottle={16}
            onScroll={onListScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadCards('refresh')}
                tintColor={theme.text}
                colors={[theme.text]}
              />
            }
            ListHeaderComponent={listHeader ?? undefined}
            ListEmptyComponent={
              <ThemedView style={styles.empty}>
                {filtering ? (
                  <ThemedText type="smallBold">Ninguna tarjeta coincide</ThemedText>
                ) : (
                  <>
                    <ThemedText type="smallBold">No hay tarjetas</ThemedText>
                    <ThemedText themeColor="textSecondary">Cuando haya tarjetas, aparecerán aquí.</ThemedText>
                  </>
                )}
              </ThemedView>
            }
            renderItem={({ item }) => (
              <FlashcardRow
                card={item}
                onInspect={() => router.push(`/cards/${item.id}` as Href)}
                onEdit={() => router.push(`/cards/${item.id}/edit` as Href)}
              />
            )}
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
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  filterGroup: {
    gap: Spacing.two,
  },
  filterToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  filterTitle: {
    flex: 1,
  },
  webPointer: {
    cursor: 'pointer',
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
