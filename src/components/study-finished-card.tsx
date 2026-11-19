import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SWIPE_THRESHOLD = 48;
const SWIPE_DURATION = 220;

interface StudyFinishedCardProps {
  onRepeat: () => void;
  onBack: () => void;
  onPrevious: () => void;
}

export function StudyFinishedCard({ onRepeat, onBack, onPrevious }: StudyFinishedCardProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const committed = useSharedValue(false);
  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);

  const gesture = useMemo(() => {
    return Gesture.Pan()
      .manualActivation(true)
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
        const goPrevious = absX >= SWIPE_THRESHOLD && Math.abs(event.translationY) <= absX * 1.7 && event.translationX > 0;
        if (!goPrevious) {
          translateX.value = withTiming(0, { duration: SWIPE_DURATION });
          return;
        }
        committed.value = true;
        translateX.value = withTiming(width, { duration: SWIPE_DURATION }, (finished) => {
          if (finished) {
            runOnJS(onPrevious)();
          }
        });
      })
      .onFinalize(() => {
        if (!committed.value) {
          translateX.value = withTiming(0, { duration: SWIPE_DURATION });
        }
      });
  }, [committed, onPrevious, touchStartX, touchStartY, translateX, width]);

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.card, { backgroundColor: theme.backgroundElement }, dragStyle]}>
      <GestureDetector gesture={gesture}>
        <View style={styles.message}>
          <ThemedText style={styles.title}>Has terminado de estudiar el Mazo</ThemedText>
        </View>
      </GestureDetector>
      <View style={styles.actions}>
        <PrimaryButton label="Repetir" onPress={onRepeat} />
        <PrimaryButton label="Volver" variant="secondary" onPress={onBack} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    width: '100%',
    borderRadius: Spacing.three,
    overflow: 'hidden',
    padding: Spacing.four,
    justifyContent: 'flex-end',
    gap: Spacing.four,
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 32,
  },
  actions: {
    gap: Spacing.two,
  },
});
