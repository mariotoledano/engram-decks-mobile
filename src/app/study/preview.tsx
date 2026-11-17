import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { saveStudySession } from '@/services/study-sessions';
import { clearStudyDraft, getStudyDraft, updateStudyDraftCards } from '@/state/study-session';
import type { Flashcard } from '@/types/api';
import { requestErrorMessage } from '@/utils/request-feedback';
import { deckHref, sessionStudyHref } from '@/utils/routes';

export default function SessionPreviewScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [draft] = useState(() => getStudyDraft());
  const [cards, setCards] = useState<Flashcard[]>(draft?.cards ?? []);
  const [name, setName] = useState(draft?.filterTags.join(', ') || 'Sesión');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const totalMatched = draft?.totalMatched ?? 0;
  const filterTags = draft?.filterTags ?? [];

  function removeCard(id: string) {
    setCards((current) => {
      const next = current.filter((card) => card.id !== id);
      updateStudyDraftCards(next);
      return next;
    });
  }

  async function onSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (trimmedName.length > 120) {
      setFormError('El nombre no puede superar 120 caracteres.');
      return;
    }
    if (cards.length === 0) {
      setFormError('La sesión no tiene tarjetas.');
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      const deck = await saveStudySession({
        name: trimmedName,
        description: description.trim() || undefined,
        tags: filterTags,
        flashcardIds: cards.map((card) => card.id),
      });
      clearStudyDraft();
      router.replace(deckHref(deck.id));
    } catch (requestError) {
      setFormError(requestErrorMessage(requestError));
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <ThemedView style={styles.empty}>
        <ThemedText style={styles.emptyText}>Genera una sesión desde el inicio.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}
        keyboardShouldPersistTaps="handled">
        <ThemedText themeColor="textSecondary">
          {cards.length} en esta sesión · {totalMatched} coincidencias
        </ThemedText>
        {cards.length === 0 ? (
          <ThemedText themeColor="textSecondary">Ninguna tarjeta coincide con el filtro.</ThemedText>
        ) : (
          cards.map((card) => (
            <ThemedView key={card.id} type="backgroundElement" style={styles.card}>
              <ThemedText numberOfLines={3}>{card.front}</ThemedText>
              <View style={styles.cardAction}>
                <PrimaryButton label="Quitar" variant="secondary" onPress={() => removeCard(card.id)} />
              </View>
            </ThemedView>
          ))
        )}
        <PrimaryButton
          label="Estudiar"
          disabled={cards.length === 0}
          onPress={() => router.push(sessionStudyHref())}
        />
        <TextField label="Nombre del mazo" value={name} onChangeText={setName} placeholder="Nombre" />
        <TextField
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Opcional"
        />
        {formError ? <ThemedText style={{ color: theme.danger }}>{formError}</ThemedText> : null}
        <PrimaryButton
          label="Guardar como mazo"
          variant="secondary"
          loading={saving}
          disabled={cards.length === 0}
          onPress={() => void onSave()}
        />
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
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardAction: {
    alignItems: 'flex-start',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
});
