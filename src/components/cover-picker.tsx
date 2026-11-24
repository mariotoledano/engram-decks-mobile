import { manipulateAsync, SaveFormat, type ImageResult } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { DeckCoverColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DeckCover } from '@/types/api';

const MAX_COVER_LENGTH = 100_000;
const TARGET_WIDTH = 480;
const FORMAT_MESSAGE =
  'La portada tiene que ser un color (por ejemplo #336699) o una imagen JPEG, PNG o WebP.';
const SIZE_MESSAGE = 'La imagen de portada es demasiado grande.';
const PERMISSION_MESSAGE = 'Permite el acceso a las fotos para elegir una imagen.';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSION = /\.(jpe?g|png|webp)$/i;

class CoverImageError extends Error {
  constructor(readonly reason: 'format' | 'size') {
    super(reason);
  }
}

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

async function resizedJpeg(uri: string, width: number, compress: number): Promise<ImageResult> {
  return manipulateAsync(uri, [{ resize: { width } }], {
    compress,
    format: SaveFormat.JPEG,
    base64: true,
  });
}

async function imageCover(asset: ImagePicker.ImagePickerAsset): Promise<DeckCover> {
  if (rejectedFormat(asset)) {
    throw new CoverImageError('format');
  }

  try {
    for (const compress of [0.7, 0.45]) {
      const result = await resizedJpeg(asset.uri, TARGET_WIDTH, compress);
      if (!result.base64) {
        throw new CoverImageError('format');
      }
      const value = `data:image/jpeg;base64,${result.base64}`;
      if (value.length <= MAX_COVER_LENGTH) {
        return { type: 'IMAGE', value };
      }
    }
  } catch (error) {
    if (error instanceof CoverImageError) {
      throw error;
    }
    throw new CoverImageError('format');
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
  const selectedColor = cover?.type === 'COLOR' ? cover.value.toUpperCase() : null;

  useEffect(() => {
    if (visible) {
      setNotice(null);
    }
  }, [visible]);

  const selectColor = (value: string) => {
    if (picking) {
      return;
    }
    onSelect({ type: 'COLOR', value });
  };

  const pickImage = async () => {
    if (picking) {
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
        quality: 0.7,
      });
      if (result.canceled || result.assets.length === 0) {
        return;
      }
      onSelect(await imageCover(result.assets[0]));
    } catch (error) {
      setNotice(error instanceof CoverImageError && error.reason === 'size' ? SIZE_MESSAGE : FORMAT_MESSAGE);
    } finally {
      setPicking(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar portada"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={[styles.dialog, { backgroundColor: theme.background, borderColor: theme.line }]}>
          <ThemedText type="smallBold">Portada</ThemedText>
          <View style={styles.swatches}>
            {DeckCoverColors.map((item) => {
              const selected = selectedColor === item.value;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected, disabled: picking }}
                  disabled={picking}
                  onPress={() => selectColor(item.value)}
                  style={({ pressed }) => [
                    styles.swatchFrame,
                    {
                      borderColor: selected ? theme.text : 'transparent',
                      backgroundColor: theme.background,
                      opacity: pressed || picking ? 0.7 : 1,
                    },
                    Platform.OS === 'web' ? styles.webPointer : null,
                  ]}>
                  <View style={[styles.swatch, { backgroundColor: item.value, borderColor: theme.line }]} />
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton
            label="Elegir imagen"
            variant="secondary"
            loading={picking}
            onPress={() => void pickImage()}
          />
          {notice ? <ThemedText themeColor="danger">{notice}</ThemedText> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxWidth: 480,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
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
