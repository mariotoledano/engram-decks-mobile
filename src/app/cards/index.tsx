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
import { AddChipButton, ChipPicker } from '@/components/chip-picker';
import { ErrorView } from '@/components/error-view';
import { FilterChipButton, type FilterChip } from '@/components/filter-chip-box';
import { FlashcardRow } from '@/components/flashcard-row';
import { DeckIcon, PlusIcon, TagIcon } from '@/components/icons';
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
  filterFlashcardsWithoutDecks,
  filterFlashcardsWithoutTags,
  filterTagNames,
  searchFlashcards,
  tagKey,
} from '@/utils/flashcards';
import { requestErrorMessage } from '@/utils/request-feedback';

const UNTAGGED_CHIP_KEY = 'missing:tags';
const UNLINKED_CHIP_KEY = 'missing:decks';

function resultLabel(count: number): string {
  return count === 1 ? '1 tarjeta' : `${count} tarjetas`;
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
  const [untaggedOnly, setUntaggedOnly] = useState(false);
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [query, setQuery] = useState('');
  const [sourceQuery, setSourceQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mode, setMode] = useState<CardMode>('search');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [decksError, setDecksError] = useState<string | null>(null);
  const searching = normalizeSearchText(query).length > 0;
  const filtering =
    searching || selectedTags.length > 0 || selectedDecks.length > 0 || untaggedOnly || unlinkedOnly;
  const matchingTags = useMemo(() => filterTagNames(tags ?? [], sourceQuery), [tags, sourceQuery]);
  const selectedTagKeys = useMemo(() => new Set(selectedTags.map(tagKey)), [selectedTags]);
  const matchingDecks = useMemo(() => filterDecksByName(decks ?? [], sourceQuery), [decks, sourceQuery]);
  const selectedDeckIds = useMemo(() => new Set(selectedDecks.map((deck) => deck.id)), [selectedDecks]);
  const visibleCards = useMemo(() => {
    if (cards === null) {
      return [];
    }
    const byText = searchFlashcards(cards, query);
    const byTags = untaggedOnly ? filterFlashcardsWithoutTags(byText) : filterFlashcardsByTags(byText, selectedTags);
    return unlinkedOnly
      ? filterFlashcardsWithoutDecks(byTags)
      : filterFlashcardsByDecks(
          byTags,
          selectedDecks.map((deck) => deck.id),
        );
  }, [cards, query, selectedDecks, selectedTags, unlinkedOnly, untaggedOnly]);
  const catalogsEmpty = tags !== null && decks !== null && tags.length === 0 && decks.length === 0;
  const sourceEmptyLabel =
    tags === null || decks === null
      ? 'Cargando…'
      : catalogsEmpty
        ? 'No hay etiquetas ni mazos'
        : 'Nada coincide con la búsqueda';
  const sourceError = tags === null ? tagsError : decks === null ? decksError : null;
  const untaggedChip = useMemo<FilterChip>(
    () => ({
      key: UNTAGGED_CHIP_KEY,
      label: 'Sin etiqueta asignada',
      selected: untaggedOnly,
      accessibilityLabel: 'Sin etiqueta asignada',
      Icon: TagIcon,
    }),
    [untaggedOnly],
  );
  const unlinkedChip = useMemo<FilterChip>(
    () => ({
      key: UNLINKED_CHIP_KEY,
      label: 'Sin mazos vinculados',
      selected: unlinkedOnly,
      accessibilityLabel: 'Sin mazos vinculados',
      Icon: DeckIcon,
    }),
    [unlinkedOnly],
  );
  const selectedChips = useMemo<FilterChip[]>(
    () => [
      ...(untaggedOnly ? [untaggedChip] : []),
      ...selectedTags.map((tag) => ({
        key: `tag:${tagKey(tag)}`,
        label: tag,
        selected: true,
        accessibilityLabel: `Etiqueta ${tag}`,
        Icon: TagIcon,
      })),
      ...(unlinkedOnly ? [unlinkedChip] : []),
      ...selectedDecks.map((deck) => ({
        key: `deck:${deck.id}`,
        label: deck.name,
        selected: true,
        accessibilityLabel: `Mazo ${deck.name}`,
        Icon: DeckIcon,
      })),
    ],
    [selectedDecks, selectedTags, unlinkedChip, unlinkedOnly, untaggedChip, untaggedOnly],
  );
  const absenceChips = useMemo<FilterChip[]>(() => [untaggedChip, unlinkedChip], [unlinkedChip, untaggedChip]);
  const sourceChips = useMemo<FilterChip[]>(
    () => [
      ...selectedTags.map((tag) => ({
        key: `tag:${tagKey(tag)}`,
        label: tag,
        selected: true,
        accessibilityLabel: `Etiqueta ${tag}`,
        Icon: TagIcon,
      })),
      ...matchingTags
        .filter((tag) => !selectedTagKeys.has(tagKey(tag)))
        .map((tag) => ({
          key: `tag:${tagKey(tag)}`,
          label: tag,
          selected: false,
          accessibilityLabel: `Etiqueta ${tag}`,
          Icon: TagIcon,
        })),
      ...selectedDecks.map((deck) => ({
        key: `deck:${deck.id}`,
        label: deck.name,
        selected: true,
        accessibilityLabel: `Mazo ${deck.name}`,
        Icon: DeckIcon,
      })),
      ...matchingDecks
        .filter((deck) => !selectedDeckIds.has(deck.id))
        .map((deck) => ({
          key: `deck:${deck.id}`,
          label: deck.name,
          selected: false,
          accessibilityLabel: `Mazo ${deck.name}`,
          Icon: DeckIcon,
        })),
    ],
    [matchingDecks, matchingTags, selectedDeckIds, selectedDecks, selectedTagKeys, selectedTags],
  );

  const changeMode = useCallback((next: CardMode) => {
    setMode(next);
    if (next !== 'edit') {
      setSelectedIds(new Set());
    }
  }, []);

  const toggleCard = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <CardModeSwitch value={mode} onChange={changeMode} />,
      headerRightContainerStyle: { paddingRight: Spacing.three },
    });
  }, [navigation, mode, changeMode]);

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

  const toggleUntagged = useCallback(() => {
    if (!untaggedOnly) {
      setSelectedTags([]);
    }
    setUntaggedOnly((current) => !current);
  }, [untaggedOnly]);

  const toggleUnlinked = useCallback(() => {
    if (!unlinkedOnly) {
      setSelectedDecks([]);
    }
    setUnlinkedOnly((current) => !current);
  }, [unlinkedOnly]);

  const toggleTag = useCallback(
    (key: string) => {
      setUntaggedOnly(false);
      setSelectedTags((current) => {
        if (current.some((item) => tagKey(item) === key)) {
          return current.filter((item) => tagKey(item) !== key);
        }
        const tag = (tags ?? []).find((item) => tagKey(item) === key);
        return tag ? [tag, ...current] : current;
      });
    },
    [tags],
  );

  const toggleDeck = useCallback(
    (id: string) => {
      setUnlinkedOnly(false);
      setSelectedDecks((current) => {
        if (current.some((item) => item.id === id)) {
          return current.filter((item) => item.id !== id);
        }
        const deck = (decks ?? []).find((item) => item.id === id);
        return deck ? [deck, ...current] : current;
      });
    },
    [decks],
  );

  const toggleSource = useCallback(
    (key: string) => {
      if (key === UNTAGGED_CHIP_KEY) {
        toggleUntagged();
        return;
      }
      if (key === UNLINKED_CHIP_KEY) {
        toggleUnlinked();
        return;
      }
      if (key.startsWith('tag:')) {
        toggleTag(key.slice(4));
        return;
      }
      if (key.startsWith('deck:')) {
        toggleDeck(key.slice(5));
      }
    },
    [toggleDeck, toggleTag, toggleUnlinked, toggleUntagged],
  );

  const retry = useCallback(() => {
    void loadCards(cardsRef.current === null ? 'initial' : 'refresh');
  }, [loadCards]);

  const openFilters = useCallback(() => {
    setSourceQuery('');
    setFiltersOpen(true);
  }, []);

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
            <View style={styles.filterRow}>
              {selectedChips.map((chip) => (
                <FilterChipButton key={chip.key} chip={chip} Icon={TagIcon} onPress={toggleSource} />
              ))}
              {selectedChips.length > 0 ? (
                <AddChipButton label="Filtrar por etiquetas o mazos" onPress={openFilters} />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Filtrar por etiquetas o mazos"
                  onPress={openFilters}
                  style={({ pressed }) => [
                    styles.promptChip,
                    {
                      borderColor: theme.line,
                      backgroundColor: pressed ? theme.backgroundSelected : theme.background,
                    },
                    Platform.OS === 'web' ? styles.webPointer : null,
                  ]}>
                  <PlusIcon color={theme.textSecondary} size={16} />
                  <ThemedText type="small">Filtrar por etiquetas o mazos</ThemedText>
                </Pressable>
              )}
            </View>
          </ThemedView>
          <FlatList
            ref={listRef}
            style={styles.listFlex}
            data={visibleCards}
            extraData={mode === 'edit' ? selectedIds : mode}
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
                selecting={mode === 'edit'}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleCard(item.id)}
                onInspect={() => router.push(`/cards/${item.id}` as Href)}
                onEdit={() => router.push(`/cards/${item.id}/edit` as Href)}
              />
            )}
          />
          {showScrollTop ? <ScrollToTopButton onPress={scrollToTop} /> : null}
          <ChipPicker
            visible={filtersOpen}
            closeLabel="Cerrar filtros"
            onClose={() => setFiltersOpen(false)}
            query={sourceQuery}
            onQueryChange={setSourceQuery}
            placeholder="Buscar etiquetas y mazos"
            searchLabel="Buscar etiquetas y mazos"
            clearLabel="Borrar búsqueda de etiquetas y mazos"
            chips={sourceChips}
            leadingChips={absenceChips}
            Icon={TagIcon}
            emptyLabel={sourceEmptyLabel}
            error={sourceChips.length === 0 ? sourceError : null}
            onPress={toggleSource}
            onRetry={retry}
          />
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.one,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.three,
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
