import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackLink } from '@/components/back-link';
import { ErrorView } from '@/components/error-view';
import { FilterChipBox, type FilterChip } from '@/components/filter-chip-box';
import { DeckIcon, TagIcon } from '@/components/icons';
import { LoadingView } from '@/components/loading-view';
import { PrimaryButton } from '@/components/primary-button';
import { SearchField } from '@/components/search-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listDecks } from '@/services/decks';
import { getFlashcard, updateFlashcard } from '@/services/flashcards';
import { listTags } from '@/services/tags';
import type { Deck } from '@/types/api';
import { filterDecksByNameAndDescription } from '@/utils/decks';
import { filterTagNames, tagKey } from '@/utils/flashcards';
import { requestErrorMessage } from '@/utils/request-feedback';

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function EditCardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ cardId: string }>();
  const cardId = routeParam(params.cardId);
  const formReady = useRef(false);
  const [tags, setTags] = useState<string[] | null>(null);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState('');
  const [deckQuery, setDeckQuery] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [decksError, setDecksError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const matchingTags = useMemo(() => filterTagNames(tags ?? [], tagQuery), [tags, tagQuery]);
  const selectedTagKeys = useMemo(() => new Set(selectedTags.map(tagKey)), [selectedTags]);
  const visibleTags = useMemo(() => {
    const rest = matchingTags.filter((tag) => !selectedTagKeys.has(tagKey(tag)));
    return [...selectedTags, ...rest];
  }, [matchingTags, selectedTagKeys, selectedTags]);
  const matchingDecks = useMemo(
    () => filterDecksByNameAndDescription(decks ?? [], deckQuery),
    [decks, deckQuery],
  );
  const selectedDeckIdSet = useMemo(() => new Set(selectedDeckIds), [selectedDeckIds]);
  const visibleDecks = useMemo(() => {
    const selected = selectedDeckIds.flatMap((id) => {
      const deck = decks?.find((item) => item.id === id);
      return deck ? [deck] : [];
    });
    const rest = matchingDecks.filter((deck) => !selectedDeckIdSet.has(deck.id));
    return [...selected, ...rest];
  }, [decks, matchingDecks, selectedDeckIdSet, selectedDeckIds]);
  const tagEmptyLabel = tags !== null && tags.length === 0 ? 'No hay etiquetas' : 'Nada coincide con la búsqueda';
  const deckEmptyLabel = decks !== null && decks.length === 0 ? 'No hay mazos' : 'Nada coincide con la búsqueda';
  const tagChips = useMemo<FilterChip[]>(
    () =>
      visibleTags.map((tag) => ({
        key: tagKey(tag),
        label: tag,
        selected: selectedTagKeys.has(tagKey(tag)),
        accessibilityLabel: `Etiqueta ${tag}`,
      })),
    [selectedTagKeys, visibleTags],
  );
  const deckChips = useMemo<FilterChip[]>(
    () =>
      visibleDecks.map((deck) => ({
        key: deck.id,
        label: deck.name,
        selected: selectedDeckIdSet.has(deck.id),
        accessibilityLabel: `Mazo ${deck.name}`,
      })),
    [selectedDeckIdSet, visibleDecks],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Edición de Tarjeta',
      headerBackVisible: false,
      headerLeft: () => <BackLink />,
    });
  }, [navigation]);

  const loadCard = useCallback(async () => {
    setLoading(true);
    try {
      const [cardResult, tagsResult, decksResult] = await Promise.allSettled([
        getFlashcard(cardId),
        listTags(),
        listDecks(),
      ]);
      if (cardResult.status === 'fulfilled') {
        if (!formReady.current) {
          const card = cardResult.value;
          setFront(card.front);
          setBack(card.back);
          setSelectedTags(card.tags ?? []);
          setSelectedDeckIds(card.deckIds ?? []);
          formReady.current = true;
        }
        setError(null);
      } else {
        setError(requestErrorMessage(cardResult.reason));
      }
      if (tagsResult.status === 'fulfilled') {
        setTags(tagsResult.value);
        setTagsError(null);
      } else {
        setTagsError(requestErrorMessage(tagsResult.reason));
      }
      if (decksResult.status === 'fulfilled') {
        setDecks(decksResult.value);
        setDecksError(null);
      } else {
        setDecksError(requestErrorMessage(decksResult.reason));
      }
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    void loadCard();
  }, [loadCard]);

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
      if (!visibleDecks.some((deck) => deck.id === id)) {
        return;
      }
      setSelectedDeckIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [id, ...current]));
    },
    [visibleDecks],
  );

  const save = useCallback(async () => {
    const nextFront = front.trim();
    const nextBack = back.trim();
    if (nextFront.length === 0 || nextBack.length === 0) {
      setNotice('El anverso y el reverso no pueden estar vacíos.');
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      await updateFlashcard(cardId, {
        front: nextFront,
        back: nextBack,
        deckIds: selectedDeckIds,
        tags: selectedTags,
      });
      router.back();
    } catch (requestError) {
      setNotice(requestErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }, [back, cardId, front, selectedDeckIds, selectedTags]);

  return (
    <ThemedView style={styles.screen}>
      {loading && !formReady.current ? (
        <LoadingView />
      ) : error && !formReady.current ? (
        <ErrorView message={error} onRetry={() => void loadCard()} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <ThemedText type="smallBold">Etiquetas</ThemedText>
            <SearchField
              value={tagQuery}
              onChange={setTagQuery}
              placeholder="Buscar etiquetas"
              accessibilityLabel="Buscar etiquetas"
              clearLabel="Borrar búsqueda de etiquetas"
            />
            <FilterChipBox
              chips={tagChips}
              Icon={TagIcon}
              emptyLabel={tagEmptyLabel}
              error={tags === null ? tagsError : null}
              onPress={toggleTag}
              onRetry={() => void loadCard()}
            />
          </View>
          <View style={styles.section}>
            <ThemedText type="smallBold">Mazos</ThemedText>
            <SearchField
              value={deckQuery}
              onChange={setDeckQuery}
              placeholder="Buscar mazos"
              accessibilityLabel="Buscar mazos"
              clearLabel="Borrar búsqueda de mazos"
            />
            <FilterChipBox
              chips={deckChips}
              Icon={DeckIcon}
              emptyLabel={deckEmptyLabel}
              error={decks === null ? decksError : null}
              onPress={toggleDeck}
              onRetry={() => void loadCard()}
            />
          </View>
          <View style={styles.section}>
            <ThemedText type="smallBold">Anverso</ThemedText>
            <TextInput
              value={front}
              onChangeText={setFront}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Anverso"
              style={[styles.editor, { color: theme.text, borderColor: theme.line, backgroundColor: theme.backgroundElement }]}
            />
          </View>
          <View style={styles.section}>
            <ThemedText type="smallBold">Reverso</ThemedText>
            <TextInput
              value={back}
              onChangeText={setBack}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Reverso"
              style={[styles.editor, { color: theme.text, borderColor: theme.line, backgroundColor: theme.backgroundElement }]}
            />
          </View>
          {notice ? (
            <ThemedText themeColor="danger" style={styles.notice}>
              {notice}
            </ThemedText>
          ) : null}
          <PrimaryButton label="Guardar" loading={saving} onPress={() => void save()} />
          <PrimaryButton label="Volver sin guardar" variant="secondary" disabled={saving} onPress={() => router.back()} />
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  editor: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 24,
  },
  notice: {
    textAlign: 'center',
  },
});
