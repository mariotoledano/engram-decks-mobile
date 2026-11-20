import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackLink } from '@/components/back-link';
import { ErrorView } from '@/components/error-view';
import { LoadingView } from '@/components/loading-view';
import { StudyCard } from '@/components/study-card';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getFlashcard } from '@/services/flashcards';
import type { Flashcard } from '@/types/api';
import { requestErrorMessage } from '@/utils/request-feedback';

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function CardPreviewScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ cardId: string }>();
  const cardId = routeParam(params.cardId);
  const [card, setCard] = useState<Flashcard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stay = useCallback(() => {}, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerBackVisible: false,
      headerLeft: () => <BackLink />,
    });
  }, [navigation]);

  const loadCard = useCallback(async () => {
    setLoading(true);
    try {
      setCard(await getFlashcard(cardId));
      setError(null);
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    void loadCard();
  }, [loadCard]);

  return (
    <ThemedView style={styles.screen}>
      {loading && card === null ? (
        <LoadingView />
      ) : error && card === null ? (
        <ErrorView message={error} onRetry={() => void loadCard()} />
      ) : card ? (
        <View style={styles.stage}>
          <StudyCard
            key={card.id}
            card={card}
            canGoPrevious={false}
            canGoNext={false}
            onPrevious={stay}
            onNext={stay}
          />
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  stage: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
  },
});
