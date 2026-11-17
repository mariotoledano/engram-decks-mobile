import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { StudyPlayer } from '@/components/study-player';
import { getStudyDraft } from '@/state/study-session';
import type { Flashcard } from '@/types/api';

export default function SessionStudyScreen() {
  const [cards, setCards] = useState<Flashcard[]>(() => getStudyDraft()?.cards ?? []);

  useFocusEffect(
    useCallback(() => {
      setCards(getStudyDraft()?.cards ?? []);
    }, []),
  );

  return (
    <StudyPlayer
      cards={cards}
      emptyMessage="Esta sesión no tiene tarjetas. Genera una desde el inicio."
    />
  );
}
