import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
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
import { createUnlinkedFlashcard, deleteFlashcard, getFlashcard, updateFlashcard } from '@/services/flashcards';
import type { Deck } from '@/types/api';
import { singleParam } from '@/utils/params';
import { requestErrorMessage } from '@/utils/request-feedback';
import { parseTags, validateTags } from '@/utils/tags';

export default function CardFormScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[]; cardId?: string | string[] }>();
  const deckId = singleParam(params.id) ?? '';
  const cardId = singleParam(params.cardId);

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>(deckId ? [deckId] : []);
  const [loading, setLoading] = useState(true);
  const [loadKey, setLoadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadForm() {
      setLoading(true);
      try {
        const [deckList, card] = await Promise.all([
          listDecks(),
          cardId ? getFlashcard(cardId) : Promise.resolve(null),
        ]);
        if (cancelled) {
          return;
        }
        setDecks(deckList);
        if (card) {
          setFront(card.front);
          setBack(card.back);
          setTagsInput((card.tags ?? []).join(', '));
          setSelectedDeckIds(card.deckIds ?? []);
        } else if (deckId) {
          setSelectedDeckIds([deckId]);
        }
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

    void loadForm();

    return () => {
      cancelled = true;
    };
  }, [cardId, deckId, loadKey]);

  function toggleDeck(id: string) {
    setSelectedDeckIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function validate(): string | null {
    const trimmedFront = front.trim();
    const trimmedBack = back.trim();
    if (!trimmedFront) {
      return 'El anverso es obligatorio.';
    }
    if (trimmedFront.length > 5000) {
      return 'El anverso no puede superar 5000 caracteres.';
    }
    if (!trimmedBack) {
      return 'El reverso es obligatorio.';
    }
    if (trimmedBack.length > 5000) {
      return 'El reverso no puede superar 5000 caracteres.';
    }
    return validateTags(parseTags(tagsInput));
  }

  async function onSubmit() {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const body = {
      front: front.trim(),
      back: back.trim(),
      deckIds: selectedDeckIds,
      tags: parseTags(tagsInput),
    };
    setFormError(null);
    setSubmitting(true);
    try {
      if (cardId) {
        await updateFlashcard(cardId, body);
      } else {
        await createUnlinkedFlashcard(body);
      }
      router.back();
    } catch (requestError) {
      setFormError(requestErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Eliminar tarjeta', 'Se eliminará la tarjeta de todos los mazos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void removeCard() },
    ]);
  }

  async function removeCard() {
    if (!cardId) {
      return;
    }
    setDeleting(true);
    try {
      await deleteFlashcard(cardId);
      router.back();
    } catch (requestError) {
      setFormError(requestErrorMessage(requestError));
      setDeleting(false);
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

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: cardId ? 'Editar tarjeta' : 'Nueva tarjeta' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}
        keyboardShouldPersistTaps="handled">
        <TextField
          label="Anverso"
          value={front}
          onChangeText={setFront}
          placeholder="Pregunta o concepto"
          multiline
        />
        <TextField
          label="Reverso"
          value={back}
          onChangeText={setBack}
          placeholder="Respuesta"
          multiline
        />
        <TextField
          label="Etiquetas"
          value={tagsInput}
          onChangeText={setTagsInput}
          placeholder="Separa las etiquetas con comas"
        />
        <ThemedText type="smallBold">Mazos</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Puedes marcar varios o ninguno.
        </ThemedText>
        {decks.length === 0 ? (
          <ThemedText themeColor="textSecondary">No hay mazos. La tarjeta quedará sin vincular.</ThemedText>
        ) : (
          decks.map((deck) => {
            const selected = selectedDeckIds.includes(deck.id);
            return (
              <Pressable
                key={deck.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => toggleDeck(deck.id)}>
                <ThemedView
                  type="backgroundElement"
                  style={[
                    styles.deckRow,
                    selected ? { backgroundColor: theme.backgroundSelected } : null,
                  ]}>
                  <ThemedText>{selected ? '✓' : '○'}</ThemedText>
                  <ThemedText style={styles.deckName}>{deck.name}</ThemedText>
                </ThemedView>
              </Pressable>
            );
          })
        )}
        {formError ? <ThemedText style={{ color: theme.danger }}>{formError}</ThemedText> : null}
        <PrimaryButton label="Guardar" loading={submitting} onPress={() => void onSubmit()} />
        {cardId ? (
          <PrimaryButton
            label="Eliminar tarjeta"
            variant="danger"
            loading={deleting}
            onPress={confirmDelete}
          />
        ) : null}
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
