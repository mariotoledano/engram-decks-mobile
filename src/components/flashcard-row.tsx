import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useCardReorder } from '@/components/deck-reorder';
import { IconButton } from '@/components/icon-button';
import { CheckIcon, EditSheetIcon, SearchIcon } from '@/components/icons';
import { SelectionChrome, selectedLift } from '@/components/selection-chrome';
import { TagLineView, useTagLineScroll } from '@/components/tag-line';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Flashcard } from '@/types/api';

const STRIPE_WIDTH = 4;
const FLIP_THRESHOLD = 48;
const FLIP_DURATION = 280;
const EDGE_ZONE = 40;
const CONTENT_INSET = STRIPE_WIDTH + Spacing.three;
const CIRCLE_SIZE = 36;

type Face = 'front' | 'back';

export type CardTapAction = 'flip' | 'open' | 'select';

interface FlashcardRowProps {
  card: Flashcard;
  index?: number;
  onInspect?: () => void;
  onEdit?: () => void;
  /**
   * `flip`: tocar o deslizar voltea la tarjeta.
   * `open` y `select`: el centro ejecuta `onPress`; los extremos y el deslizamiento lateral voltean.
   */
  tapAction?: CardTapAction;
  onPress?: () => void;
  pressAccessibilityHint?: string;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function FlashcardRow({
  card,
  index = 0,
  onInspect,
  onEdit,
  tapAction = 'flip',
  onPress,
  pressAccessibilityHint,
  selecting = false,
  selected = false,
  onToggleSelect,
}: FlashcardRowProps) {
  const theme = useTheme();
  const tags = card.tags ?? [];
  const rotation = useSharedValue(0);
  const settled = useSharedValue(0);
  const cardWidth = useSharedValue(0);
  const [face, setFace] = useState<Face>('front');
  const faceColor = selected ? theme.backgroundSelected : theme.backgroundElement;
  const reorder = useCardReorder(index, card.id);
  const tagLine = useTagLineScroll(tags, reorder.gesture);

  useEffect(() => {
    rotation.value = 0;
    settled.value = 0;
    setFace('front');
  }, [card.id, rotation, settled]);

  const showFace = useCallback((degrees: number) => {
    const normalized = ((degrees % 360) + 360) % 360;
    setFace(normalized < 90 || normalized > 270 ? 'front' : 'back');
  }, []);

  const toggleSelected = useCallback(() => {
    onToggleSelect?.();
  }, [onToggleSelect]);

  const activatesOnTap = tapAction === 'open' || tapAction === 'select';
  const openCard = useCallback(() => {
    onPress?.();
  }, [onPress]);

  const gestures = useMemo(() => {
    const turn = (direction: number) => {
      'worklet';
      const next = settled.value + direction * 180;
      settled.value = next;
      rotation.value = withTiming(next, { duration: FLIP_DURATION });
      runOnJS(showFace)(next);
    };

    const tagPan = tagLine.pan;

    const nearCardEdge = (x: number) => {
      'worklet';
      const width = cardWidth.value;
      return width > EDGE_ZONE * 2 && (x <= EDGE_ZONE || x >= width - EDGE_ZONE);
    };

    const respondToTap = (x: number) => {
      'worklet';
      if (activatesOnTap && nearCardEdge(x)) {
        turn(1);
        return;
      }
      if (activatesOnTap) {
        runOnJS(openCard)();
        return;
      }
      turn(1);
    };

    const tagTap =
      tags.length > 0
        ? Gesture.Tap()
            .maxDuration(400)
            .maxDistance(10)
            .onEnd((event) => {
              respondToTap(event.x + CONTENT_INSET);
            })
        : null;

    const pan = Gesture.Pan()
      .activeOffsetX([-16, 16])
      .failOffsetY([-12, 12])
      .onEnd((event) => {
        if (Math.abs(event.translationX) < FLIP_THRESHOLD) {
          return;
        }
        turn(event.translationX < 0 ? 1 : -1);
      });
    if (tagPan) {
      pan.requireExternalGestureToFail(tagPan);
    }

    const tap = Gesture.Tap().maxDuration(400).onEnd((event) => {
      respondToTap(event.x);
    });
    if (tagTap) {
      tap.requireExternalGestureToFail(tagTap);
    }

    const longPress = selecting
      ? Gesture.LongPress()
          .minDuration(450)
          .maxDistance(24)
          .onStart(() => {
            runOnJS(toggleSelected)();
          })
      : null;

    if (reorder.gesture && tagTap) {
      tagTap.requireExternalGestureToFail(reorder.gesture);
    }
    if (longPress && tagTap) {
      tagTap.requireExternalGestureToFail(longPress);
    }

    const flip = longPress ? Gesture.Exclusive(longPress, pan, tap) : Gesture.Exclusive(pan, tap);
    return {
      card: reorder.gesture ? Gesture.Exclusive(reorder.gesture, flip) : flip,
      tags: tagPan && tagTap ? Gesture.Exclusive(tagPan, tagTap) : tagTap,
    };
  }, [
    activatesOnTap,
    cardWidth,
    openCard,
    reorder.gesture,
    rotation,
    selecting,
    settled,
    showFace,
    tagLine.pan,
    tags.length,
    toggleSelected,
  ]);

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

  const orderingHint = reorder.draggingEnabled
    ? 'Mantén pulsado y arrastra para cambiar el orden. Toca o desliza horizontalmente para dar la vuelta'
    : null;
  const edgeFlipHint = 'Toca cerca de los extremos o desliza horizontalmente para dar la vuelta';
  const flipHint =
    tapAction === 'open'
      ? `${pressAccessibilityHint ?? 'Toca para abrir la tarjeta'}. ${edgeFlipHint}`
      : tapAction === 'select'
        ? `${selected ? 'Toca para quitar la selección' : 'Toca para seleccionar la tarjeta'}. ${edgeFlipHint}`
        : selecting
          ? 'Mantén pulsado para seleccionar. Toca o desliza horizontalmente para dar la vuelta'
          : (orderingHint ?? 'Toca o desliza horizontalmente para dar la vuelta');
  const faceLabel = face === 'front' ? card.front : card.back;

  return (
    <Animated.View style={[styles.row, reorder.animatedStyle]} onLayout={reorder.onLayout}>
      <View style={styles.cardFrame}>
        <ThemedView
          type={selected ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.card, selected ? selectedLift : null]}>
          <GestureDetector gesture={gestures.card}>
            <View
              accessible
              accessibilityRole="button"
              onLayout={(event) => {
                cardWidth.value = event.nativeEvent.layout.width;
              }}
              accessibilityLabel={
                face === 'front' && tags.length > 0 ? `${faceLabel}. ${tags.join(', ')}` : faceLabel
              }
              accessibilityState={{ selected }}
              accessibilityHint={
                tagLine.canScroll ? `${flipHint}. Desliza las etiquetas para ver el resto` : flipHint
              }>
              <Animated.View
                pointerEvents={face === 'front' ? 'auto' : 'none'}
                style={[styles.face, { backgroundColor: faceColor }, frontStyle]}
                collapsable={false}>
                <View style={[styles.stripe, { backgroundColor: theme.accent }]} />
                <View style={styles.body}>
                  <ThemedText numberOfLines={3}>{card.front}</ThemedText>
                  {tags.length > 0 && gestures.tags ? (
                    <TagLineView
                      tags={tags}
                      backgroundColor={faceColor}
                      line={tagLine}
                      gesture={gestures.tags}
                    />
                  ) : null}
                </View>
                <View style={styles.stripe} />
              </Animated.View>
              <Animated.View
                pointerEvents={face === 'back' ? 'auto' : 'none'}
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
        {selected ? <SelectionChrome /> : null}
        {selecting && !selected ? (
          <View pointerEvents="none" style={[styles.outline, { borderColor: theme.line }]} />
        ) : null}
      </View>
      {tapAction === 'flip' ? (
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
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.two,
    overflow: 'visible',
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
    overflow: 'visible',
  },
  card: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: Spacing.three,
  },
  outline: {
    ...StyleSheet.absoluteFill,
    borderRadius: Spacing.three,
    borderWidth: 2,
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
