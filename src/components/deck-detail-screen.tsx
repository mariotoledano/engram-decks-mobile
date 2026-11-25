import { router, useLocalSearchParams, useNavigation, type Href } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Modal, Platform, Pressable, RefreshControl, StyleSheet, TextInput, View, type LayoutChangeEvent } from 'react-native';

import { BackLink } from '@/components/back-link';
import { CoverPicker } from '@/components/cover-picker';
import { DeckReorderCell, DeckReorderProvider, type ListFrame, type ReorderControls } from '@/components/deck-reorder';
import { ErrorView } from '@/components/error-view';
import { FilterChipBox, FilterChipButton, type FilterChip } from '@/components/filter-chip-box';
import { FlashcardRow } from '@/components/flashcard-row';
import { PlusIcon, TagIcon } from '@/components/icons';
import { LoadingView } from '@/components/loading-view';
import { PrimaryButton } from '@/components/primary-button';
import { SearchField } from '@/components/search-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DeckCoverFrame, DEFAULT_DECK_COVER_COLOR, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDeck, patchDeck } from '@/services/decks';
import { listFlashcardsByDeck, reorderFlashcards } from '@/services/flashcards';
import { listTags } from '@/services/tags';
import type { Deck, DeckCover, Flashcard } from '@/types/api';
import { filterTagNames, tagKey } from '@/utils/flashcards';
import { requestErrorMessage } from '@/utils/request-feedback';

const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 2000;
const MAX_TAGS = 20;
const TAG_PICKER_HEIGHT = 180;

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function sameIds(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function coverColor(cover: DeckCover | undefined, fallback: string): string {
  if (cover?.type === 'COLOR' && /^#[0-9A-Fa-f]{6}$/.test(cover.value)) {
    return cover.value;
  }
  return fallback;
}

function DeckCoverBanner({ cover, accessible = true }: { cover?: DeckCover; accessible?: boolean }) {
  const theme = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = cover?.type === 'IMAGE' && Boolean(cover.value) && !imageFailed;

  return (
    <View
      accessible={accessible}
      accessibilityRole={accessible ? 'image' : undefined}
      accessibilityLabel={accessible ? 'Portada del mazo' : undefined}
      style={[styles.cover, { backgroundColor: coverColor(cover, theme.accent), borderColor: theme.line }]}>
      {showImage ? (
        <Image
          accessible={false}
          source={{ uri: cover.value }}
          style={styles.coverImage}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : null}
    </View>
  );
}

function TagChip({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={`Etiqueta ${label}`}
      style={[styles.chip, { backgroundColor: theme.background, borderColor: theme.line }]}>
      <TagIcon color={theme.textSecondary} size={16} />
      <ThemedText type="small" numberOfLines={1} style={styles.chipLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

function FeedbackBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <ThemedView type="backgroundElement" style={styles.banner}>
      <ThemedText>{message}</ThemedText>
      <Pressable accessibilityRole="button" onPress={onRetry}>
        <ThemedText type="linkPrimary">Reintentar</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

interface DeckDetailScreenProps {
  editable?: boolean;
}

export function DeckDetailScreen({ editable = false }: DeckDetailScreenProps) {
  const theme = useTheme();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ deckId: string }>();
  const deckId = routeParam(params.deckId);
  const formReady = useRef(false);
  const orderDirty = useRef(false);
  const savedOrder = useRef<string[] | null>(null);
  const listRef = useRef<FlatList<Flashcard>>(null);
  const listFrame = useRef<ListFrame>({ top: 0, height: 0 });
  const listNode = useRef<LayoutChangeEvent['target'] | null>(null);
  const reorderControls = useRef<ReorderControls>({
    setOffset: () => undefined,
    scrollTo: () => undefined,
    measure: () => undefined,
  });
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<DeckCover | undefined>(undefined);
  const [coverOpen, setCoverOpen] = useState(false);
  const [rowTags, setRowTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<string[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [tagNotice, setTagNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const matchingTags = useMemo(() => filterTagNames(catalog ?? [], tagQuery), [catalog, tagQuery]);
  const selectedTagKeys = useMemo(() => new Set(selectedTags.map(tagKey)), [selectedTags]);
  const visibleTags = useMemo(() => {
    const rest = matchingTags.filter((tag) => !selectedTagKeys.has(tagKey(tag)));
    return [...selectedTags, ...rest];
  }, [matchingTags, selectedTagKeys, selectedTags]);
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
  const tagEmptyLabel =
    catalog === null ? 'Cargando etiquetas…' : catalog.length === 0 ? 'No hay etiquetas' : 'Nada coincide con la búsqueda';
  const shownTags = editable ? rowTags : (deck?.tags ?? []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: editable ? 'Edición de mazo' : '',
      headerBackVisible: false,
      headerLeft: () => <BackLink />,
    });
  }, [editable, navigation]);

  const load = useCallback(async (loadMode: 'initial' | 'refresh') => {
    if (loadMode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [deckResult, cardsResult, tagsResult] = await Promise.allSettled([
        getDeck(deckId),
        listFlashcardsByDeck(deckId),
        editable ? listTags() : Promise.resolve([]),
      ]);
      if (deckResult.status === 'fulfilled') {
        const loaded = deckResult.value;
        setDeck(loaded);
        setError(null);
        if (editable && !formReady.current) {
          setName(loaded.name);
          setDescription(loaded.description ?? '');
          setCover(loaded.cover ?? { type: 'COLOR', value: DEFAULT_DECK_COVER_COLOR });
          setRowTags(loaded.tags ?? []);
          setSelectedTags(loaded.tags ?? []);
          formReady.current = true;
        }
      } else {
        setError(requestErrorMessage(deckResult.reason));
      }
      if (cardsResult.status === 'fulfilled') {
        if (!(editable && orderDirty.current)) {
          setCards(cardsResult.value);
          savedOrder.current = cardsResult.value.map((card) => card.id);
        }
        setCardsError(null);
      } else {
        setCardsError(requestErrorMessage(cardsResult.reason));
      }
      if (editable) {
        if (tagsResult.status === 'fulfilled') {
          setCatalog(tagsResult.value);
          setCatalogError(null);
        } else {
          setCatalogError(requestErrorMessage(tagsResult.reason));
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deckId, editable]);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const retry = useCallback(() => {
    void load(deck === null ? 'initial' : 'refresh');
  }, [deck, load]);

  const openTags = useCallback(() => {
    setTagQuery('');
    setTagNotice(null);
    setTagsOpen(true);
  }, []);

  const toggleTag = useCallback(
    (key: string) => {
      if (saving) {
        return;
      }
      const tag = rowTags.find((item) => tagKey(item) === key) ?? visibleTags.find((item) => tagKey(item) === key);
      if (!tag) {
        return;
      }
      const alreadySelected = selectedTags.some((item) => tagKey(item) === key);
      if (!alreadySelected && selectedTags.length >= MAX_TAGS) {
        setTagNotice('Puedes asignar como máximo 20 etiquetas.');
        return;
      }
      setTagNotice(null);
      setRowTags((current) => (current.some((item) => tagKey(item) === key) ? current : [...current, tag]));
      setSelectedTags((current) =>
        alreadySelected ? current.filter((item) => tagKey(item) !== key) : [...current, tag],
      );
    },
    [rowTags, saving, selectedTags, visibleTags],
  );

  const chooseCover = useCallback((next: DeckCover) => {
    setCover(next);
    setCoverOpen(false);
  }, []);

  const moveCard = useCallback((from: number, to: number) => {
    if (saving || from === to) {
      return;
    }
    setCards((current) => {
      if (!current || from < 0 || to < 0 || from >= current.length || to >= current.length) {
        return current;
      }
      const next = current.slice();
      const [moved] = next.splice(from, 1);
      if (!moved) {
        return current;
      }
      next.splice(to, 0, moved);
      return next;
    });
    orderDirty.current = true;
  }, [saving]);

  const save = useCallback(async () => {
    const nextName = name.trim();
    const nextDescription = description.trim();
    if (nextName.length === 0) {
      setNotice('El título no puede estar vacío.');
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      await patchDeck(deckId, {
        name: nextName,
        description: nextDescription,
        tags: selectedTags,
        cover: cover ?? { type: 'COLOR', value: DEFAULT_DECK_COVER_COLOR },
      });
      const ids = (cards ?? []).map((card) => card.id);
      const orderChanged = savedOrder.current !== null && !sameIds(savedOrder.current, ids);
      if (orderChanged) {
        await reorderFlashcards(deckId, ids);
      }
      router.back();
    } catch (requestError) {
      setNotice(requestErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }, [cards, cover, deckId, description, name, selectedTags]);

  const listHeader = deck ? (
    <View style={styles.header}>
      {error ? <FeedbackBanner message={error} onRetry={retry} /> : null}
      <View style={styles.identity}>
        {editable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cambiar portada"
            disabled={saving}
            onPress={() => setCoverOpen(true)}
            style={({ pressed }) => [
              styles.coverPressable,
              pressed ? styles.pressed : null,
              Platform.OS === 'web' ? styles.webPointer : null,
            ]}>
            <DeckCoverBanner
              key={`${cover?.type ?? ''}:${cover?.value ?? ''}`}
              accessible={false}
              cover={cover ?? deck.cover}
            />
          </Pressable>
        ) : (
          <DeckCoverBanner key={`${deck.cover?.type ?? ''}:${deck.cover?.value ?? ''}`} cover={deck.cover} />
        )}
        <View style={styles.identityFields}>
          <View style={styles.section}>
            <ThemedText type="smallBold">Título</ThemedText>
            <TextInput
              value={editable ? name : deck.name}
              onChangeText={editable ? setName : undefined}
              editable={editable && !saving}
              maxLength={editable ? NAME_MAX_LENGTH : undefined}
              accessibilityLabel="Título"
              style={[
                styles.field,
                styles.nameField,
                { color: theme.text, borderColor: theme.line, backgroundColor: theme.backgroundElement },
              ]}
            />
          </View>
          <View style={styles.section}>
            <ThemedText type="smallBold">Descripción</ThemedText>
            <TextInput
              value={editable ? description : (deck.description ?? '')}
              onChangeText={editable ? setDescription : undefined}
              editable={editable && !saving}
              multiline
              maxLength={editable ? DESCRIPTION_MAX_LENGTH : undefined}
              placeholder="Sin descripción"
              placeholderTextColor={theme.textSecondary}
              textAlignVertical="top"
              accessibilityLabel="Descripción"
              style={[
                styles.field,
                styles.descriptionField,
                { color: theme.text, borderColor: theme.line, backgroundColor: theme.backgroundElement },
              ]}
            />
          </View>
        </View>
      </View>
      {editable ? (
        <View style={styles.section}>
          {notice ? (
            <ThemedText themeColor="danger" style={styles.notice}>
              {notice}
            </ThemedText>
          ) : null}
          <PrimaryButton label="Guardar" loading={saving} onPress={() => void save()} />
          <PrimaryButton
            label="Volver sin guardar"
            variant="secondary"
            disabled={saving}
            onPress={() => router.back()}
          />
        </View>
      ) : null}
      <View style={styles.section}>
        <ThemedText type="smallBold">Etiquetas</ThemedText>
        {shownTags.length > 0 || editable ? (
          <View style={styles.tags}>
            {shownTags.map((tag) =>
              editable ? (
                <FilterChipButton
                  key={tagKey(tag)}
                  chip={{
                    key: tagKey(tag),
                    label: tag,
                    selected: selectedTagKeys.has(tagKey(tag)),
                    accessibilityLabel: `Etiqueta ${tag}`,
                  }}
                  Icon={TagIcon}
                  onPress={toggleTag}
                />
              ) : (
                <TagChip key={tag} label={tag} />
              ),
            )}
            {editable ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Añadir etiquetas"
                disabled={saving}
                onPress={openTags}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.addTag,
                  {
                    borderColor: theme.line,
                    backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  },
                  Platform.OS === 'web' ? styles.webPointer : null,
                ]}>
                <PlusIcon color={theme.text} size={16} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <ThemedText themeColor="textSecondary">Sin etiquetas</ThemedText>
        )}
      </View>
      <ThemedText type="smallBold">Tarjetas</ThemedText>
      {editable ? (
        <ThemedText type="small" themeColor="textSecondary">
          Mantén pulsada una tarjeta y arrástrala para cambiar el orden.
        </ThemedText>
      ) : null}
      {cardsError ? <FeedbackBanner message={cardsError} onRetry={retry} /> : null}
    </View>
  ) : null;

  const readListFrame = (target: LayoutChangeEvent['target'] | null, fallback?: { y: number; height: number }) => {
    const node = target as {
      measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
      getBoundingClientRect?: () => { top: number; height: number };
    } | null;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((_x, y, _width, height) => {
        listFrame.current = { top: y, height };
      });
      return;
    }
    const rect = node?.getBoundingClientRect?.();
    if (rect) {
      listFrame.current = { top: rect.top, height: rect.height };
      return;
    }
    if (fallback) {
      listFrame.current = { top: fallback.y, height: fallback.height };
    }
  };
  reorderControls.current.scrollTo = (offset) => {
    listRef.current?.scrollToOffset({ offset: Math.max(0, offset), animated: false });
  };
  reorderControls.current.measure = () => {
    readListFrame(listNode.current);
  };

  const list = (
    <View
      style={styles.listFlex}
      onLayout={(event) => {
        listNode.current = event.target;
        readListFrame(event.target, event.nativeEvent.layout);
      }}>
      <FlatList
        ref={listRef}
        style={styles.listFlex}
        data={cards ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        scrollEventThrottle={16}
        onScroll={(event) => reorderControls.current.setOffset(event.nativeEvent.contentOffset.y)}
        CellRendererComponent={editable ? DeckReorderCell : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load('refresh')}
            tintColor={theme.text}
            colors={[theme.text]}
          />
        }
        ListHeaderComponent={listHeader ?? undefined}
        ListEmptyComponent={
          cardsError || cards === null ? undefined : (
            <ThemedView style={styles.empty}>
              <ThemedText type="smallBold">Este mazo no tiene tarjetas</ThemedText>
            </ThemedView>
          )
        }
        renderItem={({ item, index }) => (
          <FlashcardRow
            card={item}
            index={index}
            onInspect={() => router.push(`/cards/${item.id}` as Href)}
            onEdit={editable ? () => router.push(`/cards/${item.id}/edit` as Href) : undefined}
          />
        )}
      />
    </View>
  );

  return (
    <ThemedView style={styles.screen}>
      {loading && deck === null ? (
        <LoadingView />
      ) : error && deck === null ? (
        <ErrorView message={error} onRetry={retry} />
      ) : editable ? (
        <DeckReorderProvider
          enabled={!saving}
          count={cards?.length ?? 0}
          onCommit={moveCard}
          controls={reorderControls}
          listFrame={listFrame}>
          {list}
        </DeckReorderProvider>
      ) : (
        list
      )}
      {editable ? (
        <Modal visible={tagsOpen} transparent animationType="fade" onRequestClose={() => setTagsOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar etiquetas"
              onPress={() => setTagsOpen(false)}
              style={styles.backdrop}
            />
            <View style={[styles.dialog, { backgroundColor: theme.background, borderColor: theme.line }]}>
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
                error={catalog === null ? catalogError : null}
                height={TAG_PICKER_HEIGHT}
                onPress={toggleTag}
                onRetry={retry}
              />
              {tagNotice ? <ThemedText themeColor="danger">{tagNotice}</ThemedText> : null}
            </View>
          </View>
        </Modal>
      ) : null}
      {editable ? (
        <CoverPicker visible={coverOpen} cover={cover} onClose={() => setCoverOpen(false)} onSelect={chooseCover} />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    flexGrow: 1,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  identityFields: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.three,
  },
  coverPressable: {
    width: DeckCoverFrame.width,
    height: DeckCoverFrame.height,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.85,
  },
  cover: {
    width: DeckCoverFrame.width,
    height: DeckCoverFrame.height,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  coverImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  field: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 24,
  },
  nameField: {
    minHeight: 48,
  },
  descriptionField: {
    minHeight: 120,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  addTag: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webPointer: {
    cursor: 'pointer',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 18, 16, 0.45)',
  },
  dialog: {
    zIndex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.one,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.three,
  },
  chipLabel: {
    maxWidth: 200,
    flexShrink: 1,
  },
  banner: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  notice: {
    textAlign: 'center',
  },
  empty: {
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
});
