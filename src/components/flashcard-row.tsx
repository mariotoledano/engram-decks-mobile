import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Flashcard } from '@/types/api';

const STRIPE_WIDTH = 4;
const FLIP_THRESHOLD = 48;
const FLIP_DURATION = 280;

type Face = 'front' | 'back';

interface FlashcardRowProps {
  card: Flashcard;
}

export function FlashcardRow({ card }: FlashcardRowProps) {
  const theme = useTheme();
  const tags = card.tags ?? [];
  const rotation = useSharedValue(0);
  const settled = useSharedValue(0);
  const [face, setFace] = useState<Face>('front');

  useEffect(() => {
    rotation.value = 0;
    settled.value = 0;
    setFace('front');
  }, [card.id]);

  const showFace = useCallback((degrees: number) => {
    const normalized = ((degrees % 360) + 360) % 360;
    setFace(normalized < 90 || normalized > 270 ? 'front' : 'back');
  }, []);

  const gesture = useMemo(() => {
    const turn = (direction: number) => {
      'worklet';
      const next = settled.value + direction * 180;
      settled.value = next;
      rotation.value = withTiming(next, { duration: FLIP_DURATION });
      runOnJS(showFace)(next);
    };

    const pan = Gesture.Pan()
      .activeOffsetX([-16, 16])
      .failOffsetY([-12, 12])
      .onEnd((event) => {
        if (Math.abs(event.translationX) < FLIP_THRESHOLD) {
          return;
        }
        turn(event.translationX < 0 ? 1 : -1);
      });

    const tap = Gesture.Tap().onEnd(() => {
      turn(1);
    });

    return Gesture.Exclusive(pan, tap);
  }, [rotation, settled, showFace]);

  const frontStyle = useAnimatedStyle(() => {
    const normalized = ((rotation.value % 360) + 360) % 360;
    const showingFront = normalized < 90 || normalized > 270;
    return {
      zIndex: showingFront ? 1 : 0,
      backfaceVisibility: 'hidden' as const,
      transform: [{ perspective: 800 }, { rotateY: `${rotation.value}deg` }],
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const normalized = ((rotation.value % 360) + 360) % 360;
    const showingBack = normalized >= 90 && normalized <= 270;
    return {
      zIndex: showingBack ? 1 : 0,
      backfaceVisibility: 'hidden' as const,
      transform: [{ perspective: 800 }, { rotateY: `${rotation.value + 180}deg` }],
    };
  });

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <GestureDetector gesture={gesture}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={face === 'front' ? card.front : card.back}
          accessibilityHint="Toca o desliza horizontalmente para dar la vuelta">
          <Animated.View
            style={[styles.face, { backgroundColor: theme.backgroundElement }, frontStyle]}
            collapsable={false}>
            <View style={[styles.stripe, { backgroundColor: theme.accent }]} />
            <View style={styles.body}>
              <ThemedText numberOfLines={3}>{card.front}</ThemedText>
              {tags.length > 0 ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {tags.join(' · ')}
                </ThemedText>
              ) : null}
            </View>
            <View style={styles.stripe} />
          </Animated.View>
          <Animated.View
            style={[styles.face, styles.backFace, { backgroundColor: theme.backgroundElement }, backStyle]}
            collapsable={false}>
            <View style={styles.stripe} />
            <View style={styles.body}>
              <ThemedText numberOfLines={3}>{card.back}</ThemedText>
            </View>
            <View style={[styles.stripe, { backgroundColor: theme.accent }]} />
          </Animated.View>
        </View>
      </GestureDetector>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderRadius: Spacing.three,
  },
  face: {
    width: '100%',
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'stretch',
    backfaceVisibility: 'hidden',
  },
  backFace: {
    ...StyleSheet.absoluteFill,
  },
  stripe: {
    width: STRIPE_WIDTH,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
    justifyContent: 'center',
  },
});
