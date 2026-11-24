import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { IconButton } from '@/components/icon-button';
import { CheckIcon, EditSheetIcon, SearchIcon } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Flashcard } from '@/types/api';

const STRIPE_WIDTH = 4;
const FLIP_THRESHOLD = 48;
const FLIP_DURATION = 280;
const CIRCLE_SIZE = 36;

type Face = 'front' | 'back';

interface FlashcardRowProps {
  card: Flashcard;
  onInspect: () => void;
  onEdit?: () => void;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function FlashcardRow({
  card,
  onInspect,
  onEdit,
  selecting = false,
  selected = false,
  onToggleSelect,
}: FlashcardRowProps) {
  const theme = useTheme();
  const tags = card.tags ?? [];
  const rotation = useSharedValue(0);
  const settled = useSharedValue(0);
  const [face, setFace] = useState<Face>('front');
  const faceColor = selected ? theme.backgroundSelected : theme.backgroundElement;

  useEffect(() => {
    rotation.value = 0;
    settled.value = 0;
    setFace('front');
  }, [card.id]);

  const showFace = useCallback((degrees: number) => {
    const normalized = ((degrees % 360) + 360) % 360;
    setFace(normalized < 90 || normalized > 270 ? 'front' : 'back');
  }, []);

  const toggleSelected = useCallback(() => {
    onToggleSelect?.();
  }, [onToggleSelect]);

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

    const longPress = Gesture.LongPress()
      .minDuration(450)
      .maxDistance(24)
      .onStart(() => {
        runOnJS(toggleSelected)();
      });

    const tap = Gesture.Tap()
      .maxDuration(400)
      .onEnd(() => {
        turn(1);
      });

    return selecting ? Gesture.Exclusive(longPress, pan, tap) : Gesture.Exclusive(pan, tap);
  }, [rotation, selecting, settled, showFace, toggleSelected]);

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
    <View style={styles.row}>
      <View
        style={[
          styles.cardFrame,
          selecting ? { borderWidth: 1, borderColor: selected ? theme.accent : theme.line } : null,
        ]}>
        <ThemedView type={selected ? 'backgroundSelected' : 'backgroundElement'} style={styles.card}>
          <GestureDetector gesture={gesture}>
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel={face === 'front' ? card.front : card.back}
              accessibilityState={{ selected }}
              accessibilityHint={
                selecting
                  ? 'Mantén pulsado para seleccionar. Toca o desliza horizontalmente para dar la vuelta'
                  : 'Toca o desliza horizontalmente para dar la vuelta'
              }>
              <Animated.View
                style={[styles.face, { backgroundColor: faceColor }, frontStyle]}
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
                style={[styles.face, styles.backFace, { backgroundColor: faceColor }, backStyle]}
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
      </View>
      <View style={styles.actions}>
        {selecting ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={selected ? 'Quitar selección' : 'Seleccionar tarjeta'}
            accessibilityState={{ selected }}
            onPress={onToggleSelect}
            hitSlop={6}
            style={({ pressed }) => [
              styles.circle,
              {
                backgroundColor: selected
                  ? pressed
                    ? theme.accentPressed
                    : theme.accent
                  : pressed
                    ? theme.backgroundSelected
                    : theme.backgroundElement,
                borderColor: selected ? (pressed ? theme.accentPressed : theme.accent) : theme.line,
              },
              Platform.OS === 'web' ? styles.webPointer : null,
            ]}>
            {selected ? <CheckIcon color={theme.onAccent} size={20} /> : null}
          </Pressable>
        ) : (
          <IconButton icon={SearchIcon} accessibilityLabel="Ver tarjeta" onPress={onInspect} />
        )}
        {onEdit ? (
          <IconButton icon={EditSheetIcon} accessibilityLabel="Editar tarjeta" onPress={onEdit} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.two,
  },
  actions: {
    justifyContent: 'center',
    gap: Spacing.two,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webPointer: {
    cursor: 'pointer',
  },
  cardFrame: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    borderRadius: Spacing.three,
  },
  card: {
    flex: 1,
    minWidth: 0,
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
