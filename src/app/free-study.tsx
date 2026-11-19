import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardCountSlider } from '@/components/card-count-slider';
import { ErrorView } from '@/components/error-view';
import { DeckIcon, TagIcon } from '@/components/icons';
import { LoadingView } from '@/components/loading-view';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listDecks } from '@/services/decks';
import { saveFreeStudyDeck } from '@/services/free-study-cache';
import { listFlashcards } from '@/services/flashcards';
import { listTags } from '@/services/tags';
import type { Deck } from '@/types/api';
import {
  drawFreeStudyCards,
  FREE_STUDY_COUNT_DEFAULT,
  listStudySources,
  studySourceKey,
  type StudySource,
} from '@/utils/free-study';
import { requestErrorMessage } from '@/utils/request-feedback';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

function SearchBar({ value, onChange }: SearchBarProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.searchRow, { borderColor: theme.line }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Buscar etiquetas y mazos"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Buscar etiquetas y mazos"
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

export default function FreeStudyScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const loadedRef = useRef(false);
  const [tags, setTags] = useState<string[] | null>(null);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [selected, setSelected] = useState<StudySource[]>([]);
  const [query, setQuery] = useState('');
  const [count, setCount] = useState(FREE_STUDY_COUNT_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCatalog = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') {
      setLoading(true);
    }

    try {
      const [nextTags, nextDecks] = await Promise.all([listTags(), listDecks()]);
      setTags(nextTags);
      setDecks(nextDecks);
      loadedRef.current = true;
      setError(null);
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCatalog(loadedRef.current ? 'refresh' : 'initial');
    }, [loadCatalog]),
  );

  const sources = useMemo(
    () => listStudySources(tags ?? [], decks ?? [], query),
    [tags, decks, query],
  );
  const selectedKeys = useMemo(() => new Set(selected.map(studySourceKey)), [selected]);
  const unselected = useMemo(
    () => sources.filter((source) => !selectedKeys.has(studySourceKey(source))),
    [sources, selectedKeys],
  );

  const toggle = useCallback((source: StudySource) => {
    const key = studySourceKey(source);
    setSelected((current) => {
      if (current.some((item) => studySourceKey(item) === key)) {
        return current.filter((item) => studySourceKey(item) !== key);
      }
      return [source, ...current];
    });
  }, []);

  const start = useCallback(async () => {
    const chosenTags = selected.filter((source) => source.kind === 'tag').map((source) => source.id);
    const chosenDecks = selected.filter((source) => source.kind === 'deck').map((source) => source.id);
    setStarting(true);
    setNotice(null);

    try {
      const cards = await listFlashcards();
      const drawn = drawFreeStudyCards(cards, chosenTags, chosenDecks, count);
      if (drawn.length === 0) {
        setNotice('No hay tarjetas con esa selección.');
        return;
      }
      await saveFreeStudyDeck(drawn);
      router.push('/study/free');
    } catch (requestError) {
      setNotice(requestErrorMessage(requestError));
    } finally {
      setStarting(false);
    }
  }, [count, selected]);

  const catalogEmpty = (tags?.length ?? 0) === 0 && (decks?.length ?? 0) === 0;
  const visible = [...selected, ...unselected];

  return (
    <ThemedView style={styles.screen}>
      {loading && tags === null ? (
        <LoadingView />
      ) : error && tags === null ? (
        <ErrorView message={error} onRetry={() => void loadCatalog('initial')} />
      ) : (
        <>
          <View style={styles.body}>
            <ThemedText type="smallBold">Número de tarjetas</ThemedText>
            <View style={styles.sliderRow}>
              <CardCountSlider value={count} onChange={setCount} />
              <ThemedText type="smallBold" style={styles.count}>
                {count}
              </ThemedText>
              <DeckIcon color={theme.text} size={18} />
            </View>
            <ThemedText type="smallBold">Etiquetas y Mazos</ThemedText>
            <SearchBar value={query} onChange={setQuery} />
            {error ? (
              <ThemedView type="backgroundElement" style={styles.banner}>
                <ThemedText>{error}</ThemedText>
                <Pressable accessibilityRole="button" onPress={() => void loadCatalog('refresh')}>
                  <ThemedText type="linkPrimary">Reintentar</ThemedText>
                </Pressable>
              </ThemedView>
            ) : null}
            <ThemedView type="backgroundElement" style={[styles.box, { borderColor: theme.line }]}>
              <ScrollView
                style={styles.boxScroll}
                contentContainerStyle={styles.chips}
                keyboardShouldPersistTaps="handled">
                {visible.length === 0 ? (
                  <ThemedText themeColor="textSecondary">
                    {catalogEmpty ? 'No hay etiquetas ni mazos' : 'Nada coincide con la búsqueda'}
                  </ThemedText>
                ) : (
                  visible.map((source) => {
                    const marked = selectedKeys.has(studySourceKey(source));
                    const Icon = source.kind === 'deck' ? DeckIcon : TagIcon;
                    return (
                      <Pressable
                        key={studySourceKey(source)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: marked }}
                        accessibilityLabel={source.kind === 'deck' ? `Mazo ${source.label}` : `Etiqueta ${source.label}`}
                        onPress={() => toggle(source)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: marked ? theme.backgroundSelected : theme.background,
                            borderColor: marked ? theme.accent : theme.line,
                          },
                        ]}>
                        <Icon color={marked ? theme.accent : theme.textSecondary} size={14} />
                        <ThemedText type="small" style={styles.chipLabel}>
                          {source.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </ThemedView>
          </View>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
            {notice ? (
              <ThemedText themeColor="danger" style={styles.notice}>
                {notice}
              </ThemedText>
            ) : null}
            <PrimaryButton
              label="Empezar"
              disabled={selected.length === 0}
              loading={starting}
              onPress={() => void start()}
            />
          </View>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  count: {
    minWidth: 24,
    textAlign: 'right',
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
  banner: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  box: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  boxScroll: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    padding: Spacing.three,
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
    flexShrink: 1,
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  notice: {
    textAlign: 'center',
  },
});
