import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorView } from '@/components/error-view';
import { LoadingView } from '@/components/loading-view';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createDeck, getDeck, updateDeck } from '@/services/decks';
import { singleParam } from '@/utils/params';
import { requestErrorMessage } from '@/utils/request-feedback';
import { deckHref } from '@/utils/routes';
import { parseTags, validateTags } from '@/utils/tags';

export default function DeckFormScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const deckId = singleParam(params.id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(Boolean(deckId));
  const [loadKey, setLoadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!deckId) {
      return;
    }

    let cancelled = false;

    async function loadDeck() {
      setLoading(true);
      try {
        const deck = await getDeck(deckId as string);
        if (cancelled) {
          return;
        }
        setName(deck.name);
        setDescription(deck.description ?? '');
        setTagsInput((deck.tags ?? []).join(', '));
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

    void loadDeck();

    return () => {
      cancelled = true;
    };
  }, [deckId, loadKey]);

  function validate(): string | null {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return 'El nombre es obligatorio.';
    }
    if (trimmedName.length > 120) {
      return 'El nombre no puede superar 120 caracteres.';
    }
    if (description.trim().length > 2000) {
      return 'La descripción no puede superar 2000 caracteres.';
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
      name: name.trim(),
      description: description.trim(),
      tags: parseTags(tagsInput),
    };

    setFormError(null);
    setSubmitting(true);
    try {
      if (deckId) {
        await updateDeck(deckId, body);
        router.back();
        return;
      }
      const created = await createDeck(body);
      router.replace(deckHref(created.id));
    } catch (requestError) {
      setFormError(requestErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingView />;
  }

  if (error && deckId) {
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
      <Stack.Screen options={{ title: deckId ? 'Editar mazo' : 'Nuevo mazo' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}
        keyboardShouldPersistTaps="handled">
        <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Nombre del mazo" />
        <TextField
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="De qué trata este mazo"
          multiline
        />
        <TextField
          label="Etiquetas"
          value={tagsInput}
          onChangeText={setTagsInput}
          placeholder="Separa las etiquetas con comas"
        />
        {formError ? <ThemedText style={{ color: theme.danger }}>{formError}</ThemedText> : null}
        <PrimaryButton label="Guardar" loading={submitting} onPress={() => void onSubmit()} />
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
});
