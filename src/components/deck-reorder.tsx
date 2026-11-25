import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import type { Flashcard } from '@/types/api';

const HOLD_MS = 320;
const ROW_FALLBACK_HEIGHT = 96;
const SCROLL_EDGE = 64;
const SCROLL_STEP = 14;

export type ListFrame = { top: number; height: number };

export type ReorderControls = {
  setOffset: (offset: number) => void;
  scrollTo: (offset: number) => void;
  measure: () => void;
};

type DeckReorderContextValue = {
  enabled: boolean;
  count: number;
  activeId: SharedValue<string>;
  targetIndex: SharedValue<number>;
  translationY: SharedValue<number>;
  stride: SharedValue<number>;
  heights: SharedValue<number[]>;
  scrollOffset: SharedValue<number>;
  scrollOrigin: SharedValue<number>;
  gestureDy: SharedValue<number>;
  fingerY: SharedValue<number>;
  dragFrom: SharedValue<number>;
  controls: RefObject<ReorderControls>;
  listFrame: RefObject<ListFrame>;
  commit: (from: number, to: number) => void;
};

const DeckReorderContext = createContext<DeckReorderContextValue | null>(null);

export function DeckReorderProvider({
  enabled,
  count,
  onCommit,
  controls,
  listFrame,
  children,
}: {
  enabled: boolean;
  count: number;
  onCommit: (from: number, to: number) => void;
  controls: RefObject<ReorderControls>;
  listFrame: RefObject<ListFrame>;
  children: ReactNode;
}) {
  const activeId = useSharedValue('');
  const targetIndex = useSharedValue(-1);
  const translationY = useSharedValue(0);
  const stride = useSharedValue(ROW_FALLBACK_HEIGHT + Spacing.three);
  const heights = useSharedValue<number[]>([]);
  const scrollOffset = useSharedValue(0);
  const scrollOrigin = useSharedValue(0);
  const gestureDy = useSharedValue(0);
  const fingerY = useSharedValue(0);
  const dragFrom = useSharedValue(-1);

  useEffect(() => {
    controls.current.setOffset = (offset: number) => {
      scrollOffset.value = offset;
    };
  }, [controls, scrollOffset]);

  const value = useMemo<DeckReorderContextValue>(
    () => ({
      enabled,
      count,
      activeId,
      targetIndex,
      translationY,
      stride,
      heights,
      scrollOffset,
      scrollOrigin,
      gestureDy,
      fingerY,
      dragFrom,
      controls,
      listFrame,
      commit: onCommit,
    }),
    [
      enabled,
      count,
      activeId,
      targetIndex,
      translationY,
      stride,
      heights,
      scrollOffset,
      scrollOrigin,
      gestureDy,
      fingerY,
      dragFrom,
      controls,
      listFrame,
      onCommit,
    ],
  );

  return <DeckReorderContext.Provider value={value}>{children}</DeckReorderContext.Provider>;
}

function useDeckReorder(): DeckReorderContextValue | null {
  return useContext(DeckReorderContext);
}

function placeFor(from: number, translation: number, stride: number, count: number): number {
  'worklet';
  if (stride <= 0 || count <= 0) {
    return from;
  }
  const delta = Math.round(translation / stride);
  return Math.min(count - 1, Math.max(0, from + delta));
}

export function useCardReorder(index: number, cardId: string) {
  const reorder = useDeckReorder();
  const shift = useSharedValue(0);
  const origin = useRef<number | null>(null);
  const scrolling = useRef(false);
  const raf = useRef(0);

  useAnimatedReaction(
    () => {
      if (!reorder) {
        return 0;
      }
      const active = reorder.activeId.value;
      if (active.length === 0 || active === cardId) {
        return 0;
      }
      const from = reorder.dragFrom.value;
      const target = reorder.targetIndex.value;
      const distance = reorder.stride.value;
      if (from < target && index > from && index <= target) {
        return -distance;
      }
      if (target < from && index >= target && index < from) {
        return distance;
      }
      return 0;
    },
    (next, previous) => {
      if (next === previous) {
        return;
      }
      shift.value = next === 0 ? 0 : withTiming(next, { duration: 160 });
    },
  );

  const stopScroll = useCallback(() => {
    scrolling.current = false;
    if (raf.current !== 0) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    }
  }, []);

  const followScroll = useCallback(() => {
    if (!reorder || !scrolling.current) {
      return;
    }
    const frame = reorder.listFrame.current;
    const y = reorder.fingerY.value;
    if (frame.height > 0) {
      let delta = 0;
      if (y < frame.top + SCROLL_EDGE) {
        delta = -SCROLL_STEP;
      } else if (y > frame.top + frame.height - SCROLL_EDGE) {
        delta = SCROLL_STEP;
      }
      if (delta !== 0) {
        const next = Math.max(0, reorder.scrollOffset.value + delta);
        reorder.controls.current.scrollTo(next);
        reorder.scrollOffset.value = next;
        const visual = reorder.gestureDy.value + (reorder.scrollOffset.value - reorder.scrollOrigin.value);
        reorder.translationY.value = visual;
        reorder.targetIndex.value = placeFor(reorder.dragFrom.value, visual, reorder.stride.value, reorder.count);
      }
    }
    raf.current = requestAnimationFrame(followScroll);
  }, [reorder]);

  const beginScroll = useCallback(() => {
    if (!reorder) {
      return;
    }
    reorder.controls.current.measure();
    stopScroll();
    scrolling.current = true;
    raf.current = requestAnimationFrame(followScroll);
  }, [followScroll, reorder, stopScroll]);

  const endDrag = useCallback(
    (from: number, to: number) => {
      if (!reorder) {
        return;
      }
      stopScroll();
      if (to === from || to < 0) {
        reorder.activeId.value = '';
        reorder.translationY.value = 0;
        reorder.targetIndex.value = -1;
        return;
      }
      origin.current = from;
      reorder.commit(from, to);
    },
    [reorder, stopScroll],
  );

  useLayoutEffect(() => {
    if (!reorder || origin.current == null || origin.current === index) {
      return;
    }
    reorder.translationY.value = 0;
    reorder.activeId.value = '';
    reorder.targetIndex.value = -1;
    origin.current = null;
  }, [index, reorder]);

  useEffect(() => stopScroll, [stopScroll]);

  const gesture = useMemo(() => {
    if (!reorder?.enabled) {
      return null;
    }
    const state = reorder;
    return Gesture.Pan()
      .activateAfterLongPress(HOLD_MS)
      .onStart(() => {
        const height = state.heights.value[index] || ROW_FALLBACK_HEIGHT;
        state.stride.value = height + Spacing.three;
        state.scrollOrigin.value = state.scrollOffset.value;
        state.gestureDy.value = 0;
        state.dragFrom.value = index;
        state.targetIndex.value = index;
        state.translationY.value = 0;
        state.activeId.value = cardId;
        runOnJS(beginScroll)();
      })
      .onUpdate((event) => {
        state.gestureDy.value = event.translationY;
        state.fingerY.value = event.absoluteY;
        const visual = event.translationY + (state.scrollOffset.value - state.scrollOrigin.value);
        state.translationY.value = visual;
        state.targetIndex.value = placeFor(index, visual, state.stride.value, state.count);
      })
      .onEnd(() => {
        runOnJS(endDrag)(index, state.targetIndex.value);
      })
      .onFinalize((_event, success) => {
        runOnJS(stopScroll)();
        if (!success && state.activeId.value === cardId) {
          state.activeId.value = '';
          state.translationY.value = 0;
          state.targetIndex.value = -1;
        }
      });
  }, [beginScroll, cardId, endDrag, index, reorder, stopScroll]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!reorder) {
      return {};
    }
    const mine = reorder.activeId.value === cardId;
    return {
      zIndex: mine ? 30 : 0,
      elevation: mine ? 12 : 0,
      transform: [{ translateY: mine ? reorder.translationY.value : shift.value }, { scale: mine ? 1.03 : 1 }],
    };
  });

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!reorder) {
        return;
      }
      const height = event.nativeEvent.layout.height;
      const next = reorder.heights.value.slice();
      if (next[index] === height) {
        return;
      }
      next[index] = height;
      reorder.heights.value = next;
    },
    [index, reorder],
  );

  return { gesture, animatedStyle, onLayout, draggingEnabled: reorder?.enabled ?? false };
}

type CellProps = {
  item: Flashcard;
  index?: number;
  cellKey?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function DeckReorderCell({ item, style, children, onLayout, index: _index, cellKey: _key, ...rest }: CellProps) {
  const reorder = useDeckReorder();
  const animatedStyle = useAnimatedStyle(() => ({
    zIndex: reorder?.activeId.value === item.id ? 30 : 0,
    elevation: reorder?.activeId.value === item.id ? 12 : 0,
    overflow: 'visible' as const,
  }));

  return (
    <Animated.View {...rest} onLayout={onLayout} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
