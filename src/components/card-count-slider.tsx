import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FREE_STUDY_COUNT_MAX, FREE_STUDY_COUNT_MIN } from '@/utils/free-study';

const THUMB_SIZE = 22;
const TRACK_HIT = 44;

interface CardCountSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function CardCountSlider({ value, onChange }: CardCountSliderProps) {
  const theme = useTheme();
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const applyX = useCallback((x: number) => {
    const width = widthRef.current;
    if (width <= 0) {
      return;
    }

    const ratio = Math.min(1, Math.max(0, x / width));
    const next = FREE_STUDY_COUNT_MIN + Math.round(ratio * (FREE_STUDY_COUNT_MAX - FREE_STUDY_COUNT_MIN));
    if (next === valueRef.current) {
      return;
    }

    valueRef.current = next;
    onChangeRef.current(next);
  }, []);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          runOnJS(applyX)(event.x);
        })
        .onUpdate((event) => {
          runOnJS(applyX)(event.x);
        }),
    [applyX],
  );

  const span = FREE_STUDY_COUNT_MAX - FREE_STUDY_COUNT_MIN;
  const ratio = span === 0 ? 0 : (value - FREE_STUDY_COUNT_MIN) / span;
  const thumbTravel = Math.max(0, trackWidth - THUMB_SIZE);
  const thumbLeft = ratio * thumbTravel;

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Número de tarjetas"
        accessibilityValue={{ min: FREE_STUDY_COUNT_MIN, max: FREE_STUDY_COUNT_MAX, now: value }}
        accessibilityActions={[
          { name: 'increment', label: 'Aumentar' },
          { name: 'decrement', label: 'Reducir' },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') {
            onChange(Math.min(FREE_STUDY_COUNT_MAX, value + 1));
          }
          if (event.nativeEvent.actionName === 'decrement') {
            onChange(Math.max(FREE_STUDY_COUNT_MIN, value - 1));
          }
        }}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          widthRef.current = width;
          setTrackWidth(width);
        }}
        style={styles.hit}>
        <View style={[styles.track, { backgroundColor: theme.line }]} />
        <View
          pointerEvents="none"
          style={[styles.thumb, { backgroundColor: theme.accent, transform: [{ translateX: thumbLeft }] }]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hit: {
    flex: 1,
    height: TRACK_HIT,
    justifyContent: 'center',
  },
  track: {
    height: Spacing.one,
    borderRadius: Spacing.half,
  },
  thumb: {
    position: 'absolute',
    top: (TRACK_HIT - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
});
