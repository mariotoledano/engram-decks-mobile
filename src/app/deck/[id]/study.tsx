import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { ErrorView } from '@/components/error-view';
import { LoadingView } from '@/components/loading-view';
import { StudyPlayer } from '@/components/study-player';
import { listFlashcards } from '@/services/flashcards';
import type { Flashcard } from '@/types/api';
import { singleParam } from '@/utils/params';
import { requestErrorMessage } from '@/utils/request-feedback';

export default function StudyScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const deckId = singleParam(params.id) ?? '';

  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    if (!deckId) {
      setError('No se encontró el mazo.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await listFlashcards(deckId);
      setCards(data);
      setError(null);
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  if (loading && cards === null) {
    return <LoadingView />;
  }

  if (error && cards === null) {
    return <ErrorView message={error} onRetry={() => void loadCards()} />;
  }

  return <StudyPlayer cards={cards ?? []} emptyMessage="Este mazo no tiene tarjetas." />;
}
