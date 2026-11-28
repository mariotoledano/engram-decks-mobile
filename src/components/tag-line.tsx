import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/**
 * Línea de etiquetas de un mazo o una tarjeta.
 * Si no caben, se arrastran en horizontal; los puntos suspensivos indican que sigue habiendo texto a la derecha.
 * En las fichas de mazo el arrastre es un scroll horizontal nativo, para que la lista vertical no se lo quede.
 * Las listas nuevas deben usar este componente, o `FlashcardRow` / `DeckCard`, que ya lo incluyen.
 */
type LineGesture = GestureType | ReturnType<typeof Gesture.Exclusive>;

export type TagLineScroll = {
  canScroll: boolean;
  pan: GestureType | null;
  translateX: SharedValue<number>;
  ellipsis: SharedValue<number>;
  onViewportLayout: (event: LayoutChangeEvent) => void;
  onContentLayout: (event: LayoutChangeEvent) => void;
};

export function useTagLineScroll(tags: readonly string[], dragWaitsFor?: GestureType | null): TagLineScroll {
  const signature = tags.join('\u0000');
  const translateX = useSharedValue(0);
  const offset = useSharedValue(0);
  const maxOffset = useSharedValue(0);
  const viewportWidth = useSharedValue(0);
  const contentWidth = useSharedValue(0);
  const ellipsis = useSharedValue(0);
  const [canScroll, setCanScroll] = useState(false);

  const publishBounds = useCallback(() => {
    const hidden = Math.max(0, contentWidth.value - viewportWidth.value);
    maxOffset.value = hidden;
    if (-translateX.value > hidden) {
      translateX.value = -hidden;
      offset.value = -hidden;
    }
    ellipsis.value = hidden > 1 && -translateX.value < hidden - 1 ? 1 : 0;
    const next = hidden > 1;
    setCanScroll((current) => (current === next ? current : next));
  }, [contentWidth, ellipsis, maxOffset, offset, translateX, viewportWidth]);

  useEffect(() => {
    translateX.value = 0;
    offset.value = 0;
    publishBounds();
  }, [offset, publishBounds, signature, translateX]);

  const pan = useMemo(() => {
    if (!canScroll) {
      return null;
    }
    const gesture = Gesture.Pan()
      .activeOffsetX([-8, 8])
      .failOffsetY([-12, 12])
      .onUpdate((event) => {
        const next = offset.value + event.translationX;
        const clamped = Math.min(0, Math.max(-maxOffset.value, next));
        translateX.value = clamped;
        const hidden = maxOffset.value;
        ellipsis.value = hidden > 1 && -clamped < hidden - 1 ? 1 : 0;
      })
      .onFinalize(() => {
        offset.value = translateX.value;
      });
    if (dragWaitsFor) {
      gesture.requireExternalGestureToFail(dragWaitsFor);
    }
    return gesture;
  }, [canScroll, dragWaitsFor, ellipsis, maxOffset, offset, translateX]);

  const onViewportLayout = (event: LayoutChangeEvent) => {
    viewportWidth.value = event.nativeEvent.layout.width;
    publishBounds();
  };
  const onContentLayout = (event: LayoutChangeEvent) => {
    contentWidth.value = event.nativeEvent.layout.width;
    publishBounds();
  };

  return { canScroll, pan, translateX, ellipsis, onViewportLayout, onContentLayout };
}

export function TagLineView({
  tags,
  backgroundColor,
  line,
  gesture,
  style,
}: {
  tags: readonly string[];
  backgroundColor: string;
  line: TagLineScroll;
  gesture?: LineGesture | null;
  style?: StyleProp<ViewStyle>;
}) {
  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: line.translateX.value }],
  }));
  const ellipsisStyle = useAnimatedStyle(() => ({
    opacity: line.ellipsis.value,
  }));
  const window = (
    <View
      accessibilityLabel={tags.join(', ')}
      accessibilityHint={line.canScroll ? 'Desliza para ver el resto de etiquetas' : undefined}
      style={[styles.window, style, Platform.OS === 'web' && line.canScroll ? webWindow : null]}
      onLayout={line.onViewportLayout}>
      <Animated.View style={[styles.track, trackStyle]} onLayout={line.onContentLayout}>
        {tags.map((tag, index) => (
          <ThemedText key={`${index}:${tag}`} type="small" themeColor="textSecondary" style={styles.tag}>
            {index > 0 ? ` · ${tag}` : tag}
          </ThemedText>
        ))}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.ellipsis, { backgroundColor }, ellipsisStyle]}>
        <ThemedText type="small" themeColor="textSecondary">
          …
        </ThemedText>
      </Animated.View>
    </View>
  );

  if (!gesture) {
    return window;
  }

  return <GestureDetector gesture={gesture}>{window}</GestureDetector>;
}

type TagLineProps = {
  tags: readonly string[];
  backgroundColor: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onCanScrollChange?: (canScroll: boolean) => void;
};

function TagTexts({ tags }: { tags: readonly string[] }) {
  return tags.map((tag, index) => (
    <ThemedText key={`${index}:${tag}`} type="small" themeColor="textSecondary" style={styles.tag}>
      {index > 0 ? ` · ${tag}` : tag}
    </ThemedText>
  ));
}

function domNode(node: unknown): HTMLElement | null {
  if (node == null || typeof node !== 'object' || !('addEventListener' in node)) {
    return null;
  }
  const candidate = node as { addEventListener?: unknown };
  return typeof candidate.addEventListener === 'function' ? (node as HTMLElement) : null;
}

function ScrollTagLine({ tags, backgroundColor, style, onPress, onCanScrollChange }: TagLineProps) {
  const signature = tags.join('\u0000');
  const frame = useRef<ComponentRef<typeof View>>(null);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const viewportWidth = useRef(0);
  const contentWidth = useRef(0);
  const [overflow, setOverflow] = useState(false);
  const ellipsis = useSharedValue(0);
  const onPressRef = useRef(onPress);
  const onCanScrollChangeRef = useRef(onCanScrollChange);
  onPressRef.current = onPress;
  onCanScrollChangeRef.current = onCanScrollChange;

  const publish = useCallback(() => {
    const hidden = Math.max(0, contentWidth.current - viewportWidth.current);
    const next = hidden > 1;
    setOverflow((current) => (current === next ? current : next));
    ellipsis.value = next ? 1 : 0;
  }, [ellipsis]);

  useEffect(() => {
    scroller.current?.scrollTo({ x: 0, animated: false });
    const hidden = Math.max(0, contentWidth.current - viewportWidth.current);
    ellipsis.value = hidden > 1 ? 1 : 0;
  }, [ellipsis, signature]);

  useEffect(() => {
    onCanScrollChangeRef.current?.(overflow);
  }, [overflow]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }
    const frameNode = domNode(frame.current);
    const scrollNode = frameNode?.querySelector('div') ?? null;
    const scrollable =
      scrollNode != null &&
      (getComputedStyle(scrollNode).overflowX === 'auto' || getComputedStyle(scrollNode).overflowX === 'scroll')
        ? scrollNode
        : null;
    if (frameNode == null || scrollable == null) {
      return undefined;
    }
    let originX = 0;
    let originLeft = 0;
    let active = false;
    const onDown = (event: PointerEvent) => {
      active = true;
      originX = event.clientX;
      originLeft = scrollable.scrollLeft;
      try {
        frameNode.setPointerCapture(event.pointerId);
      } catch {
        // Los eventos sintéticos no tienen un puntero activo.
      }
    };
    const onMove = (event: PointerEvent) => {
      if (!active) {
        return;
      }
      if (!overflow) {
        return;
      }
      const delta = event.clientX - originX;
      if (Math.abs(delta) < 8) {
        return;
      }
      const max = Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);
      scrollable.scrollLeft = Math.min(max, Math.max(0, originLeft - delta));
      event.preventDefault();
    };
    const onUp = (event: PointerEvent) => {
      const delta = event.clientX - originX;
      const wasActive = active;
      active = false;
      if (wasActive && Math.abs(delta) <= 10) {
        onPressRef.current?.();
      }
    };
    frameNode.addEventListener('pointerdown', onDown, true);
    frameNode.addEventListener('pointermove', onMove, true);
    frameNode.addEventListener('pointerup', onUp, true);
    frameNode.addEventListener('pointercancel', onUp, true);
    return () => {
      frameNode.removeEventListener('pointerdown', onDown, true);
      frameNode.removeEventListener('pointermove', onMove, true);
      frameNode.removeEventListener('pointerup', onUp, true);
      frameNode.removeEventListener('pointercancel', onUp, true);
    };
  }, [overflow]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const hidden = Math.max(0, event.contentSize.width - event.layoutMeasurement.width);
      ellipsis.value = hidden > 1 && event.contentOffset.x < hidden - 1 ? 1 : 0;
    },
  });
  const ellipsisStyle = useAnimatedStyle(() => ({
    opacity: ellipsis.value,
  }));
  const startX = useRef(0);
  const onTouchStart = (event: GestureResponderEvent) => {
    startX.current = event.nativeEvent.pageX;
  };
  const onTouchEnd = (event: GestureResponderEvent) => {
    if (Math.abs(event.nativeEvent.pageX - startX.current) <= 10) {
      onPressRef.current?.();
    }
  };

  const texts = <TagTexts tags={tags} />;

  return (
    <View
      ref={frame}
      accessibilityLabel={tags.join(', ')}
      accessibilityHint={overflow ? 'Desliza para ver el resto de etiquetas' : undefined}
      style={[styles.window, styles.line, style, Platform.OS === 'web' && overflow ? webWindow : null]}
      onLayout={(event) => {
        viewportWidth.current = event.nativeEvent.layout.width;
        publish();
      }}>
      <Animated.ScrollView
        ref={scroller}
        horizontal
        scrollEnabled={overflow}
        nestedScrollEnabled
        directionalLockEnabled
        bounces={false}
        alwaysBounceHorizontal={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onContentSizeChange={(width) => {
          contentWidth.current = width;
          publish();
        }}
        onTouchStart={Platform.OS !== 'web' && onPress ? onTouchStart : undefined}
        onTouchEnd={Platform.OS !== 'web' && onPress ? onTouchEnd : undefined}
        style={styles.scroller}
        contentContainerStyle={styles.track}>
        {texts}
      </Animated.ScrollView>
      <Animated.View pointerEvents="none" style={[styles.ellipsis, { backgroundColor }, ellipsisStyle]}>
        <ThemedText type="small" themeColor="textSecondary">
          …
        </ThemedText>
      </Animated.View>
    </View>
  );
}

export function TagLine(props: TagLineProps) {
  if (props.tags.length === 0) {
    return <View pointerEvents="none" style={[styles.window, styles.line, props.style]} />;
  }
  return <ScrollTagLine {...props} />;
}

const styles = StyleSheet.create({
  window: {
    alignSelf: 'stretch',
    minWidth: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  line: {
    height: 20,
  },
  scroller: {
    ...StyleSheet.absoluteFill,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  tag: {
    flexShrink: 0,
  },
  ellipsis: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: Spacing.half,
  },
});

const webWindow = {
  userSelect: 'none',
  cursor: 'grab',
  touchAction: 'pan-y',
} as ViewStyle;
