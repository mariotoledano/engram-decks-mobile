import { manipulateAsync, SaveFormat, type ImageResult } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { DeckCoverColors, DeckCoverFrame, DEFAULT_DECK_COVER_COLOR, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DeckCover } from '@/types/api';

const MAX_COVER_LENGTH = 100_000;
const MAX_WORKING_EDGE = 1600;
const MAX_USER_SCALE = 4;
const FRAME_BORDER = 1;
const FRAME_W = DeckCoverFrame.width - FRAME_BORDER * 2;
const FRAME_H = DeckCoverFrame.height - FRAME_BORDER * 2;
const FORMAT_MESSAGE =
  'La portada tiene que ser un color (por ejemplo #336699) o una imagen JPEG, PNG o WebP.';
const SIZE_MESSAGE = 'La imagen de portada es demasiado grande.';
const PERMISSION_MESSAGE = 'Permite el acceso a las fotos para elegir una imagen.';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSION = /\.(jpe?g|png|webp)$/i;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

const AnimatedImage = Animated.createAnimatedComponent(Image);

class CoverImageError extends Error {
  constructor(readonly reason: 'format' | 'size') {
    super(reason);
  }
}

interface Frame {
  scale: number;
  x: number;
  y: number;
}

interface ColorState {
  kind: 'color';
  value: string;
}

interface ImageState {
  kind: 'image';
  uri: string;
  width: number;
  height: number;
  frame: Frame;
}

type EditorState = ColorState | ImageState;

const IDENTITY_FRAME: Frame = { scale: 1, x: 0, y: 0 };

function rejectedFormat(asset: ImagePicker.ImagePickerAsset): boolean {
  if (asset.type && asset.type !== 'image') {
    return true;
  }
  const mime = asset.mimeType?.toLowerCase();
  if (mime) {
    return !ALLOWED_MIME.has(mime);
  }
  const name = asset.fileName ?? asset.file?.name;
  if (name && /\.[a-z0-9]+$/i.test(name)) {
    return !ALLOWED_EXTENSION.test(name);
  }
  return false;
}

function readImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

function coverScaleOf(imageWidth: number, imageHeight: number): number {
  'worklet';
  return Math.max(FRAME_W / imageWidth, FRAME_H / imageHeight);
}

function clampUserScale(value: number): number {
  'worklet';
  return Math.min(MAX_USER_SCALE, Math.max(1, value));
}

function frameTranslation(x: number, y: number, userScale: number, imageWidth: number, imageHeight: number) {
  'worklet';
  const dispW = imageWidth * coverScaleOf(imageWidth, imageHeight) * userScale;
  const dispH = imageHeight * coverScaleOf(imageWidth, imageHeight) * userScale;
  const maxX = Math.max(0, (dispW - FRAME_W) / 2);
  const maxY = Math.max(0, (dispH - FRAME_H) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
}

function sameFrame(a: Frame, b: Frame): boolean {
  return Math.abs(a.scale - b.scale) < 0.001 && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
}

function visibleCrop(imageWidth: number, imageHeight: number, frame: Frame) {
  const base = Math.max(FRAME_W / imageWidth, FRAME_H / imageHeight) * frame.scale;
  const dispW = imageWidth * base;
  const dispH = imageHeight * base;
  const left = (FRAME_W - dispW) / 2 + frame.x;
  const top = (FRAME_H - dispH) / 2 + frame.y;
  const rawX = ((0 - left) / dispW) * imageWidth;
  const rawY = ((0 - top) / dispH) * imageHeight;
  const rawW = (FRAME_W / dispW) * imageWidth;
  const rawH = (FRAME_H / dispH) * imageHeight;
  const originX = Math.min(Math.max(0, Math.round(rawX)), imageWidth - 1);
  const originY = Math.min(Math.max(0, Math.round(rawY)), imageHeight - 1);
  return {
    originX,
    originY,
    width: Math.max(1, Math.min(imageWidth - originX, Math.round(rawW))),
    height: Math.max(1, Math.min(imageHeight - originY, Math.round(rawH))),
  };
}

function colorState(value: string | undefined): ColorState {
  return { kind: 'color', value: value && COLOR_PATTERN.test(value) ? value : DEFAULT_DECK_COVER_COLOR };
}

async function editorStateFromCover(cover?: DeckCover): Promise<EditorState> {
  if (cover?.type === 'IMAGE' && cover.value) {
    try {
      const size = await readImageSize(cover.value);
      if (size.width > 0 && size.height > 0) {
        return { kind: 'image', uri: cover.value, width: size.width, height: size.height, frame: IDENTITY_FRAME };
      }
    } catch {
      return colorState(undefined);
    }
  }
  return colorState(cover?.type === 'COLOR' ? cover.value : undefined);
}

async function workingImage(uri: string, width: number, height: number): Promise<{ uri: string; width: number; height: number }> {
  const edge = Math.max(width, height);
  if (edge <= MAX_WORKING_EDGE) {
    return { uri, width, height };
  }
  const targetWidth = width >= height ? MAX_WORKING_EDGE : Math.max(1, Math.round((MAX_WORKING_EDGE * width) / height));
  const result = await manipulateAsync(uri, [{ resize: { width: targetWidth } }], {
    compress: 0.92,
    format: SaveFormat.JPEG,
  });
  if (!result.width || !result.height) {
    throw new CoverImageError('format');
  }
  return { uri: result.uri, width: result.width, height: result.height };
}

async function resizedJpeg(uri: string, actions: Parameters<typeof manipulateAsync>[1], compress: number): Promise<ImageResult> {
  return manipulateAsync(uri, actions, { compress, format: SaveFormat.JPEG, base64: true });
}

function aspectMatchesFrame(width: number, height: number): boolean {
  return Math.abs(width / height - FRAME_W / FRAME_H) < 0.02;
}

async function framedCover(state: ImageState, frame: Frame): Promise<string> {
  if (
    state.uri.startsWith('data:image/') &&
    state.uri.length <= MAX_COVER_LENGTH &&
    sameFrame(frame, IDENTITY_FRAME) &&
    aspectMatchesFrame(state.width, state.height)
  ) {
    return state.uri;
  }

  const crop = visibleCrop(state.width, state.height, frame);
  const targets = [FRAME_W * 3, FRAME_W * 2, FRAME_W];
  for (const targetWidth of targets) {
    const targetHeight = Math.max(1, Math.round((targetWidth * FRAME_H) / FRAME_W));
    for (const compress of [0.72, 0.5, 0.35]) {
      const result = await resizedJpeg(
        state.uri,
        [{ crop }, { resize: { width: targetWidth, height: targetHeight } }],
        compress,
      );
      if (!result.base64) {
        continue;
      }
      const value = `data:image/jpeg;base64,${result.base64}`;
      if (value.length <= MAX_COVER_LENGTH) {
        return value;
      }
    }
  }
  throw new CoverImageError('size');
}

interface CoverPickerProps {
  visible: boolean;
  cover?: DeckCover;
  onClose: () => void;
  onSelect: (cover: DeckCover) => void;
}

export function CoverPicker({ visible, cover, onClose, onSelect }: CoverPickerProps) {
  const theme = useTheme();
  const [notice, setNotice] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<EditorState[]>([]);
  const [index, setIndex] = useState(0);
  const historyRef = useRef<EditorState[]>([]);
  const indexRef = useRef(0);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameNode = useRef<HTMLElement | null>(null);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const imageWidth = useSharedValue(1);
  const imageHeight = useSharedValue(1);
  const current = history[index];
  const framedUri = current?.kind === 'image' ? current.uri : undefined;
  const busy = picking || exporting;
  const selectedColor = current?.kind === 'color' ? current.value.toUpperCase() : null;

  const clearCommit = useCallback(() => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
  }, []);

  const applyState = useCallback(
    (state: EditorState) => {
      if (state.kind === 'color') {
        imageWidth.value = 1;
        imageHeight.value = 1;
        scale.value = 1;
        translateX.value = 0;
        translateY.value = 0;
        return;
      }
      imageWidth.value = state.width;
      imageHeight.value = state.height;
      scale.value = state.frame.scale;
      translateX.value = state.frame.x;
      translateY.value = state.frame.y;
    },
    [imageHeight, imageWidth, scale, translateX, translateY],
  );

  const push = useCallback(
    (state: EditorState) => {
      clearCommit();
      const nextHistory = [...historyRef.current.slice(0, indexRef.current + 1), state];
      historyRef.current = nextHistory;
      indexRef.current = nextHistory.length - 1;
      applyState(state);
      setHistory(nextHistory);
      setIndex(nextHistory.length - 1);
    },
    [applyState, clearCommit],
  );

  const commitCurrentFrame = useCallback(() => {
    const state = historyRef.current[indexRef.current];
    if (!state || state.kind !== 'image') {
      return;
    }
    const frame = { scale: scale.value, x: translateX.value, y: translateY.value };
    if (sameFrame(state.frame, frame)) {
      return;
    }
    const nextHistory = [...historyRef.current.slice(0, indexRef.current + 1), { ...state, frame }];
    historyRef.current = nextHistory;
    indexRef.current = nextHistory.length - 1;
    setHistory(nextHistory);
    setIndex(nextHistory.length - 1);
  }, [scale, translateX, translateY]);

  const scheduleCommit = useCallback(() => {
    clearCommit();
    commitTimer.current = setTimeout(() => {
      commitTimer.current = null;
      commitCurrentFrame();
    }, 160);
  }, [clearCommit, commitCurrentFrame]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setNotice(null);
    setHistory([]);
    setIndex(0);
    historyRef.current = [];
    indexRef.current = 0;
    void (async () => {
      const initial = await editorStateFromCover(cover);
      if (cancelled) {
        return;
      }
      historyRef.current = [initial];
      indexRef.current = 0;
      applyState(initial);
      setHistory([initial]);
      setIndex(0);
      if (cover?.type === 'IMAGE' && initial.kind === 'color') {
        setNotice(FORMAT_MESSAGE);
      }
    })();
    return () => {
      cancelled = true;
      clearCommit();
    };
  }, [applyState, clearCommit, cover, visible]);

  const undo = useCallback(() => {
    if (busy) {
      return;
    }
    clearCommit();
    if (indexRef.current <= 0) {
      onClose();
      return;
    }
    const nextIndex = indexRef.current - 1;
    indexRef.current = nextIndex;
    applyState(historyRef.current[nextIndex]);
    setIndex(nextIndex);
  }, [applyState, busy, clearCommit, onClose]);

  const selectColor = (value: string) => {
    if (busy) {
      return;
    }
    const state = historyRef.current[indexRef.current];
    if (state?.kind === 'color' && state.value.toUpperCase() === value.toUpperCase()) {
      return;
    }
    setNotice(null);
    push({ kind: 'color', value });
  };

  const pickImage = async () => {
    if (busy) {
      return;
    }
    setNotice(null);
    setPicking(true);
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setNotice(PERMISSION_MESSAGE);
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (result.canceled || result.assets.length === 0) {
        return;
      }
      const asset = result.assets[0];
      if (rejectedFormat(asset)) {
        throw new CoverImageError('format');
      }
      const size = asset.width && asset.height ? { width: asset.width, height: asset.height } : await readImageSize(asset.uri);
      const working = await workingImage(asset.uri, size.width, size.height);
      push({ kind: 'image', ...working, frame: IDENTITY_FRAME });
    } catch (error) {
      setNotice(error instanceof CoverImageError && error.reason === 'size' ? SIZE_MESSAGE : FORMAT_MESSAGE);
    } finally {
      setPicking(false);
    }
  };

  const finish = async () => {
    if (busy) {
      return;
    }
    clearCommit();
    commitCurrentFrame();
    const state = historyRef.current[indexRef.current];
    if (!state) {
      return;
    }
    if (state.kind === 'color') {
      onSelect({ type: 'COLOR', value: state.value });
      return;
    }
    const frame = { scale: scale.value, x: translateX.value, y: translateY.value };
    setExporting(true);
    setNotice(null);
    try {
      onSelect({ type: 'IMAGE', value: await framedCover(state, frame) });
    } catch (error) {
      setNotice(error instanceof CoverImageError && error.reason === 'size' ? SIZE_MESSAGE : FORMAT_MESSAGE);
    } finally {
      setExporting(false);
    }
  };

  const zoomAt = useCallback(
    (focalX: number, focalY: number, factor: number) => {
      if (historyRef.current[indexRef.current]?.kind !== 'image') {
        return;
      }
      const nextScale = clampUserScale(scale.value * factor);
      const ratio = nextScale / scale.value;
      const fx = focalX - FRAME_W / 2;
      const fy = focalY - FRAME_H / 2;
      const moved = frameTranslation(
        fx - (fx - translateX.value) * ratio,
        fy - (fy - translateY.value) * ratio,
        nextScale,
        imageWidth.value,
        imageHeight.value,
      );
      scale.value = nextScale;
      translateX.value = moved.x;
      translateY.value = moved.y;
      scheduleCommit();
    },
    [imageHeight, imageWidth, scale, scheduleCommit, translateX, translateY],
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || !framedUri) {
      return;
    }
    const node = frameNode.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * rect.height : event.deltaY;
      zoomAt(event.clientX - rect.left - FRAME_BORDER, event.clientY - rect.top - FRAME_BORDER, Math.exp(-delta * 0.0018));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [framedUri, visible, zoomAt]);

  const imageActive = current?.kind === 'image' && !busy;
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(imageActive)
      .maxPointers(1)
      .onChange((event) => {
        const moved = frameTranslation(
          translateX.value + event.changeX,
          translateY.value + event.changeY,
          scale.value,
          imageWidth.value,
          imageHeight.value,
        );
        translateX.value = moved.x;
        translateY.value = moved.y;
      })
      .onEnd(() => {
        runOnJS(scheduleCommit)();
      });

    const pinch = Gesture.Pinch()
      .enabled(imageActive)
      .onChange((event) => {
        if (!event.scaleChange || !Number.isFinite(event.scaleChange)) {
          return;
        }
        const nextScale = clampUserScale(scale.value * event.scaleChange);
        const ratio = nextScale / scale.value;
        const fx = event.focalX - FRAME_W / 2;
        const fy = event.focalY - FRAME_H / 2;
        const moved = frameTranslation(
          fx - (fx - translateX.value) * ratio,
          fy - (fy - translateY.value) * ratio,
          nextScale,
          imageWidth.value,
          imageHeight.value,
        );
        scale.value = nextScale;
        translateX.value = moved.x;
        translateY.value = moved.y;
      })
      .onEnd(() => {
        runOnJS(scheduleCommit)();
      });

    return Gesture.Simultaneous(pan, pinch);
  }, [imageActive, imageHeight, imageWidth, scale, scheduleCommit, translateX, translateY]);

  const imageStyle = useAnimatedStyle(() => {
    const base = coverScaleOf(imageWidth.value, imageHeight.value);
    const dispW = imageWidth.value * base * scale.value;
    const dispH = imageHeight.value * base * scale.value;
    return {
      position: 'absolute',
      width: dispW,
      height: dispH,
      left: (FRAME_W - dispW) / 2 + translateX.value,
      top: (FRAME_H - dispH) / 2 + translateY.value,
    };
  });

  const frameColor = current?.kind === 'color' ? current.value : theme.backgroundElement;
  const frameLabel =
    current?.kind === 'image'
      ? 'Encuadre de la portada. Arrastra la imagen y pellizca o usa la rueda para ampliar.'
      : `Color de portada ${DeckCoverColors.find((item) => item.value.toUpperCase() === selectedColor)?.name ?? 'seleccionado'}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar sin aplicar"
            disabled={busy}
            onPress={onClose}
            style={styles.backdrop}
          />
          <View style={[styles.dialog, { backgroundColor: theme.background, borderColor: theme.line }]}>
            <View style={styles.editor}>
              <GestureDetector gesture={gesture}>
                <View
                  ref={(node) => {
                    frameNode.current = node as unknown as HTMLElement | null;
                  }}
                  collapsable={false}
                  accessibilityLabel={frameLabel}
                  style={[
                    styles.frame,
                    { backgroundColor: frameColor, borderColor: theme.line },
                    Platform.OS === 'web' && current?.kind === 'image' ? styles.grab : null,
                  ]}>
                  {current?.kind === 'image' ? (
                    <AnimatedImage
                      key={current.uri}
                      accessible={false}
                      pointerEvents="none"
                      source={{ uri: current.uri }}
                      style={imageStyle}
                      resizeMode="cover"
                    />
                  ) : null}
                  {!current ? <ActivityIndicator color={theme.text} /> : null}
                </View>
              </GestureDetector>
              <View style={styles.side}>
                <ThemedText type="smallBold">Portada</ThemedText>
                <View style={styles.swatches}>
                  {DeckCoverColors.map((item) => {
                    const selected = selectedColor === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        accessibilityRole="button"
                        accessibilityLabel={item.name}
                        accessibilityState={{ selected, disabled: busy }}
                        disabled={busy}
                        onPress={() => selectColor(item.value)}
                        style={({ pressed }) => [
                          styles.swatchFrame,
                          {
                            borderColor: selected ? theme.text : 'transparent',
                            backgroundColor: theme.background,
                            opacity: pressed || busy ? 0.7 : 1,
                          },
                          Platform.OS === 'web' ? styles.webPointer : null,
                        ]}>
                        <View style={[styles.swatch, { backgroundColor: item.value, borderColor: theme.line }]} />
                      </Pressable>
                    );
                  })}
                </View>
                <PrimaryButton label="Imagen" variant="secondary" loading={picking} disabled={exporting} onPress={() => void pickImage()} />
                <PrimaryButton label="Listo" loading={exporting} disabled={picking || !current} onPress={() => void finish()} />
                <PrimaryButton label="Deshacer" variant="secondary" disabled={busy || !current} onPress={undo} />
                {notice ? <ThemedText themeColor="danger">{notice}</ThemedText> : null}
              </View>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 18, 16, 0.45)',
  },
  dialog: {
    zIndex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  editor: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  frame: {
    width: DeckCoverFrame.width,
    height: DeckCoverFrame.height,
    flexShrink: 0,
    borderWidth: FRAME_BORDER,
    borderRadius: Spacing.three,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
  },
  grab: {
    cursor: 'grab',
  },
  side: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.two,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  swatchFrame: {
    borderWidth: 2,
    borderRadius: 999,
    padding: 3,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  webPointer: {
    cursor: 'pointer',
  },
});
