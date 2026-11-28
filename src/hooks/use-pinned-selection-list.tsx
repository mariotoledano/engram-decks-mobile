import { useCallback, useLayoutEffect, useMemo, useRef, type ReactElement, type ReactNode, type RefObject } from 'react';
import {
  View,
  type FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import {
  pinSelectedFirst,
  pinSetChanged,
  sameMembers,
  sameOrder,
  scrollOffsetAfterReorder,
} from '@/utils/pinned-selection';

const CAMERA_LOCK_MS = 280;

interface PinnedSelectionList<T> {
  listRef: RefObject<FlatList<T> | null>;
  ordered: readonly T[];
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollBeginDrag: () => void;
  onContentSizeChange: () => void;
  onItemLayout: (id: string, height: number) => void;
  wrapHeader: (header: ReactNode) => ReactElement | undefined;
  releaseCameraLock: () => void;
}

/**
 * Pone lo seleccionado arriba y mantiene el scroll en el tramo que se estaba viendo.
 * La cámara no acompaña a la pieza que sube.
 */
export function usePinnedSelectionList<T extends { id: string }>(
  items: readonly T[],
  pinnedIds: ReadonlySet<string>,
): PinnedSelectionList<T> {
  const listRef = useRef<FlatList<T>>(null);
  const heights = useRef(new Map<string, number>());
  const headerHeight = useRef(0);
  const scrollY = useRef(0);
  const previousIds = useRef<string[] | null>(null);
  const previousPinned = useRef<ReadonlySet<string>>(new Set());
  const lockedOffset = useRef<number | null>(null);
  const lockGeneration = useRef(0);
  const ordered = useMemo(() => pinSelectedFirst(items, pinnedIds, (item) => item.id), [items, pinnedIds]);

  const releaseCameraLock = useCallback(() => {
    lockGeneration.current += 1;
    lockedOffset.current = null;
  }, []);

  const applyLockedOffset = useCallback((offset: number) => {
    listRef.current?.scrollToOffset({ offset, animated: false });
  }, []);

  const lockCamera = useCallback(
    (offset: number) => {
      const generation = lockGeneration.current + 1;
      lockGeneration.current = generation;
      lockedOffset.current = offset;
      scrollY.current = offset;
      applyLockedOffset(offset);
      requestAnimationFrame(() => {
        if (lockGeneration.current !== generation) {
          return;
        }
        applyLockedOffset(offset);
        requestAnimationFrame(() => {
          if (lockGeneration.current !== generation) {
            return;
          }
          applyLockedOffset(offset);
        });
      });
      setTimeout(() => {
        if (lockGeneration.current === generation) {
          lockedOffset.current = null;
        }
      }, CAMERA_LOCK_MS);
    },
    [applyLockedOffset],
  );

  useLayoutEffect(() => {
    const nextIds = ordered.map((item) => item.id);
    const prevIds = previousIds.current;
    const prevPinned = previousPinned.current;
    previousIds.current = nextIds;
    previousPinned.current = pinnedIds;

    if (prevIds == null || !pinSetChanged(prevPinned, pinnedIds)) {
      return;
    }
    if (!sameMembers(prevIds, nextIds) || sameOrder(prevIds, nextIds)) {
      return;
    }

    const offset =
      scrollOffsetAfterReorder({
        oldIds: prevIds,
        newIds: nextIds,
        heights: heights.current,
        gap: Spacing.three,
        headerHeight: headerHeight.current,
        scrollY: scrollY.current,
        prevPinned,
        nextPinned: pinnedIds,
      }) ?? scrollY.current;
    lockCamera(offset);
  }, [lockCamera, ordered, pinnedIds]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const locked = lockedOffset.current;
      if (locked != null && Math.abs(y - locked) > 1) {
        applyLockedOffset(locked);
        return;
      }
      scrollY.current = y;
    },
    [applyLockedOffset],
  );

  const onContentSizeChange = useCallback(() => {
    const locked = lockedOffset.current;
    if (locked == null) {
      return;
    }
    applyLockedOffset(locked);
  }, [applyLockedOffset]);

  const onItemLayout = useCallback((id: string, height: number) => {
    if (height > 0) {
      heights.current.set(id, height);
    }
  }, []);

  const wrapHeader = useCallback((header: ReactNode) => {
    if (header == null || header === false) {
      headerHeight.current = 0;
      return undefined;
    }
    return (
      <View
        onLayout={(event: LayoutChangeEvent) => {
          headerHeight.current = event.nativeEvent.layout.height;
        }}>
        {header}
      </View>
    );
  }, []);

  return {
    listRef,
    ordered,
    onScroll,
    onScrollBeginDrag: releaseCameraLock,
    onContentSizeChange,
    onItemLayout,
    wrapHeader,
    releaseCameraLock,
  };
}
