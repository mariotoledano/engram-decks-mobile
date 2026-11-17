import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorView } from '@/components/error-view';
import { LoadingView } from '@/components/loading-view';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listDecks } from '@/services/decks';
import { previewStudySession } from '@/services/study-sessions';
import { listTags } from '@/services/tags';
import { setStudyDraft } from '@/state/study-session';
import type { Deck, TagMatch } from '@/types/api';
import { requestErrorMessage } from '@/utils/request-feedback';
import { sessionPreviewHref } from '@/utils/routes';
import { parseTags, validateTags } from '@/utils/tags';

export default function NewSessionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [tagsInput, setTagsInput] = useState('');
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);
  const [match, setMatch] = useState<TagMatch>('ANY');
  const [limitInput, setLimitInput] = useState('20');
  const [shuffle, setShuffle] = useState(true);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadKey, setLoadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoading(true);
      try {
        const [tags, deckList] = await Promise.all([listTags(), listDecks()]);
        if (cancelled) {
          return;
        }
        setKnownTags(tags);
        setDecks(deckList);
        setError(null);
      } catch (requestError) {
        if (!cancelled) {
          setError(requestErrorMessage(requestError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  function toggleTag(tag: string) {
    const current = parseTags(tagsInput);
    const next = current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag];
    setTagsInput(next.join(', '));
  }

  function toggleDeck(id: string) {
    setSelectedDeckIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function onGenerate() {
    const tags = parseTags(tagsInput);
    const tagError = validateTags(tags);
    if (tagError) {
      setFormError(tagError);
      return;
    }
    const limit = Number(limitInput);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      setFormError('El número de tarjetas tiene que estar entre 1 y 200.');
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const preview = await previewStudySession({
        tags,
        match,
        limit,
        shuffle,
        deckIds: selectedDeckIds,
        query: query.trim() || undefined,
      });
      setStudyDraft({
        cards: preview.cards,
        totalMatched: preview.totalMatched,
        filterTags: tags,
      });
      router.push(sessionPreviewHref());
    } catch (requestError) {
      setFormError(requestErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingView />;
  }

  if (error) {
    return (
      <ErrorView
        message={error}
        onRetry={() => {
          setError(null);
          setLoading(true);
          setLoadKey((value) => value + 1);
        }}
      />
    );
  }

  const selectedTags = parseTags(tagsInput);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}
        keyboardShouldPersistTaps="handled">
        <ThemedText themeColor="textSecondary">
          La sesión no se guarda hasta que lo pidas. Puedes mezclar tarjetas de cualquier mazo.
        </ThemedText>
        <TextField
          label="Etiquetas"
          value={tagsInput}
          onChangeText={setTagsInput}
          placeholder="Separa las etiquetas con comas"
        />
        {knownTags.length > 0 ? (
          <View style={styles.chips}>
            {knownTags.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <Pressable key={tag} accessibilityRole="button" onPress={() => toggleTag(tag)}>
                  <ThemedView
                    type={selected ? 'backgroundSelected' : 'backgroundElement'}
                    style={styles.chip}>
                    <ThemedText type="small">{tag}</ThemedText>
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <View style={styles.matchRow}>
          <PrimaryButton
            label="Cualquiera"
            variant={match === 'ANY' ? 'primary' : 'secondary'}
            onPress={() => setMatch('ANY')}
          />
          <PrimaryButton
            label="Todas"
            variant={match === 'ALL' ? 'primary' : 'secondary'}
            onPress={() => setMatch('ALL')}
          />
        </View>
        <TextField
          label="Número de tarjetas"
          value={limitInput}
          onChangeText={setLimitInput}
          placeholder="20"
          inputProps={{ keyboardType: 'number-pad' }}
        />
        <TextField
          label="Texto"
          value={query}
          onChangeText={setQuery}
          placeholder="Opcional: anverso o reverso"
        />
        <View style={styles.switchRow}>
          <ThemedText>Barajar</ThemedText>
          <Switch
            value={shuffle}
            onValueChange={setShuffle}
            trackColor={{ true: theme.accent, false: theme.line }}
            thumbColor={theme.backgroundElement}
          />
        </View>
        <ThemedText type="smallBold">Limitar a mazos</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Si no marcas ninguno, entran tarjetas de toda la colección.
        </ThemedText>
        {decks.map((deck) => {
          const selected = selectedDeckIds.includes(deck.id);
          return (
            <Pressable
              key={deck.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggleDeck(deck.id)}>
              <ThemedView
                type="backgroundElement"
                style={[styles.deckRow, selected ? { backgroundColor: theme.backgroundSelected } : null]}>
                <ThemedText>{selected ? '✓' : '○'}</ThemedText>
                <ThemedText style={styles.deckName}>{deck.name}</ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}
        {formError ? <ThemedText style={{ color: theme.danger }}>{formError}</ThemedText> : null}
        <PrimaryButton label="Generar" loading={submitting} onPress={() => void onGenerate()} />
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  matchRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deckRow: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  deckName: {
    flex: 1,
  },
});
