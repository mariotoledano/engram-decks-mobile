import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Flashcard } from '@/types/api';

const STRIPE_WIDTH = 4;
const SWIPE_THRESHOLD = 48;
const SWIPE_DURATION = 220;
const FLIP_DURATION = 280;

type Face = 'front' | 'back';

interface StudyCardProps {
  card: Flashcard;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function StudyCard({ card, canGoPrevious, canGoNext, onPrevious, onNext }: StudyCardProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const rotation = useSharedValue(0);
  const settled = useSharedValue(0);
  const translateX = useSharedValue(0);
  const committed = useSharedValue(false);
  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);
  const [face, setFace] = useState<Face>('front');
  const frontNative = useMemo(() => Gesture.Native(), []);
  const backNative = useMemo(() => Gesture.Native(), []);

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
      .manualActivation(true)
      .simultaneousWithExternalGesture(frontNative, backNative)
      .onTouchesDown((event) => {
        const touch = event.allTouches[0];
        if (touch) {
          touchStartX.value = touch.absoluteX;
          touchStartY.value = touch.absoluteY;
        }
      })
      .onTouchesMove((event, state) => {
        if (committed.value) {
          return;
        }
        const touch = event.allTouches[0];
        if (!touch) {
          return;
        }
        const absX = Math.abs(touch.absoluteX - touchStartX.value);
        const absY = Math.abs(touch.absoluteY - touchStartY.value);
        if (absX >= 18 && absY <= absX * 1.7) {
          state.activate();
          return;
        }
        if (absY >= 28 && absY > absX * 2) {
          state.fail();
        }
      })
      .onUpdate((event) => {
        if (committed.value) {
          return;
        }
        translateX.value = event.translationX;
      })
      .onEnd((event) => {
        if (committed.value) {
          return;
        }
        const absX = Math.abs(event.translationX);
        const mostlyHorizontal = absX >= SWIPE_THRESHOLD && Math.abs(event.translationY) <= absX * 1.7;
        const goNext = mostlyHorizontal && event.translationX < 0 && canGoNext;
        const goPrevious = mostlyHorizontal && event.translationX > 0 && canGoPrevious;
        if (!goNext && !goPrevious) {
          translateX.value = withTiming(0, { duration: SWIPE_DURATION });
          return;
        }
        committed.value = true;
        const target = goNext ? -width : width;
        const navigate = goNext ? onNext : onPrevious;
        translateX.value = withTiming(target, { duration: SWIPE_DURATION }, (finished) => {
          if (finished) {
            runOnJS(navigate)();
          }
        });
      })
      .onFinalize(() => {
        if (!committed.value) {
          translateX.value = withTiming(0, { duration: SWIPE_DURATION });
        }
      });

    const tap = Gesture.Tap().onEnd(() => {
      if (committed.value) {
        return;
      }
      turn(1);
    });

    return Gesture.Exclusive(pan, tap);
  }, [
    backNative,
    canGoNext,
    canGoPrevious,
    committed,
    frontNative,
    onNext,
    onPrevious,
    rotation,
    settled,
    showFace,
    touchStartX,
    touchStartY,
    translateX,
    width,
  ]);

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

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

  const hint =
    face === 'front'
      ? 'Toca para ver el reverso. Desliza a la izquierda para la siguiente y a la derecha para la anterior.'
      : 'Toca para ver el anverso. Desliza a la izquierda para la siguiente y a la derecha para la anterior.';

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={face === 'front' ? card.front : card.back}
        accessibilityHint={hint}
        collapsable={false}
        style={[styles.card, { backgroundColor: theme.backgroundElement }, dragStyle]}>
        <Animated.View
          style={[styles.face, { backgroundColor: theme.backgroundElement }, frontStyle]}
          collapsable={false}>
          <View style={[styles.stripe, { backgroundColor: theme.accent }]} />
          <GestureDetector gesture={frontNative}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.copy}
              showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.faceText}>{card.front}</ThemedText>
            </ScrollView>
          </GestureDetector>
          <View style={styles.stripe} />
        </Animated.View>
        <Animated.View
          style={[styles.face, styles.backFace, { backgroundColor: theme.backgroundElement }, backStyle]}
          collapsable={false}>
          <View style={styles.stripe} />
          <GestureDetector gesture={backNative}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.copy}
              showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.faceText}>{card.back}</ThemedText>
            </ScrollView>
          </GestureDetector>
          <View style={[styles.stripe, { backgroundColor: theme.accent }]} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderRadius: Spacing.three,
  },
  face: {
    flex: 1,
    width: '100%',
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
  scroll: {
    flex: 1,
  },
  copy: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  faceText: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 32,
  },
});
