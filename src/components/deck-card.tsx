import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { DeckIcon } from '@/components/icons';
import { SelectionChrome, selectedLift } from '@/components/selection-chrome';
import { TagLine } from '@/components/tag-line';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Deck, DeckCover } from '@/types/api';

const COVER_WIDTH = 64;
const DESCRIPTION_LINES = 3;

function coverColor(cover: DeckCover | undefined): string {
  if (cover?.type === 'COLOR' && /^#[0-9A-Fa-f]{6}$/.test(cover.value)) {
    return cover.value;
  }
  return Colors.light.accent;
}

function DeckCoverArt({ cover }: { cover?: DeckCover }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = cover?.type === 'IMAGE' && Boolean(cover.value) && !imageFailed;

  return (
    <View style={[styles.cover, { backgroundColor: coverColor(cover) }]}>
      {showImage ? (
        <Image
          accessible={false}
          pointerEvents="none"
          source={{ uri: cover.value }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : null}
    </View>
  );
}

interface DeckCardProps {
  deck: Deck;
  href?: Href;
  onPress?: () => void;
  selected?: boolean;
}

function cardCountLabel(count: number): string {
  return count === 1 ? '1 carta' : `${count} cartas`;
}

export function DeckCard({ deck, href, onPress, selected = false }: DeckCardProps) {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);
  const [canScrollTags, setCanScrollTags] = useState(false);
  const tags = deck.tags ?? [];
  const cardCount = deck.cardCount ?? 0;
  const canOpen = Boolean(href || onPress);
  const faceColor = selected ? theme.backgroundSelected : theme.backgroundElement;
  const openDeck = useCallback(() => {
    if (href) {
      router.push(href);
      return;
    }
    onPress?.();
  }, [href, onPress]);
  const pressIn = useCallback(() => setPressed(true), []);
  const pressOut = useCallback(() => setPressed(false), []);
  const hint = [
    !href && onPress ? (selected ? 'Quita la selección del mazo' : 'Selecciona el mazo') : null,
    canScrollTags ? 'Desliza las etiquetas para ver el resto' : null,
  ]
    .filter((part) => part != null)
    .join('. ');
  const label = [deck.name, cardCountLabel(cardCount), tags.length > 0 ? tags.join(', ') : null]
    .filter((part) => part != null)
    .join('. ');

  const count = (
    <>
      <ThemedText type="small" themeColor="textSecondary">
        {cardCount}
      </ThemedText>
      <DeckIcon color={theme.textSecondary} size={14} />
    </>
  );

  const copy = (
    <>
      <ThemedText type="smallBold" numberOfLines={2}>
        {deck.name}
      </ThemedText>
      {deck.description ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={DESCRIPTION_LINES}>
          {deck.description}
        </ThemedText>
      ) : null}
    </>
  );

  return (
    <View style={styles.shell}>
      <ThemedView
        type={selected ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.card, selected ? selectedLift : null, pressed ? styles.pressed : null]}>
        <View style={styles.coverColumn}>
          <DeckCoverArt cover={deck.cover} />
          {canOpen ? (
            <Pressable
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no"
              onPress={openDeck}
              onPressIn={pressIn}
              onPressOut={pressOut}
              style={[StyleSheet.absoluteFill, webPointer]}
            />
          ) : null}
        </View>
        <View style={styles.body}>
          {canOpen ? (
            <Pressable
              accessibilityRole={href ? 'link' : 'button'}
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              accessibilityHint={hint || undefined}
              onPress={openDeck}
              onPressIn={pressIn}
              onPressOut={pressOut}
              style={[styles.copyHit, styles.copy, webPointer]}>
              {copy}
            </Pressable>
          ) : (
            <View style={[styles.copyHit, styles.copy]}>{copy}</View>
          )}
          <View style={styles.meta}>
            <TagLine
              tags={tags}
              backgroundColor={faceColor}
              style={styles.tagSlot}
              onPress={canOpen ? openDeck : undefined}
              onCanScrollChange={setCanScrollTags}
            />
            {canOpen ? (
              <Pressable
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
                onPress={openDeck}
                onPressIn={pressIn}
                onPressOut={pressOut}
                style={[styles.count, webPointer]}>
                {count}
              </Pressable>
            ) : (
              <View accessibilityLabel={cardCountLabel(cardCount)} style={styles.count}>
                {count}
              </View>
            )}
          </View>
        </View>
      </ThemedView>
      {selected ? <SelectionChrome /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    overflow: 'visible',
  },
  card: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    borderRadius: Spacing.three,
    minHeight: 96,
  },
  pressed: {
    opacity: 0.85,
  },
  coverColumn: {
    width: COVER_WIDTH,
    alignSelf: 'stretch',
  },
  cover: {
    ...StyleSheet.absoluteFill,
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingVertical: Spacing.three,
    paddingRight: Spacing.three,
    paddingLeft: Spacing.three,
    gap: Spacing.two,
  },
  copyHit: {
    flexGrow: 1,
    alignSelf: 'stretch',
    minWidth: 0,
    justifyContent: 'center',
  },
  copy: {
    gap: Spacing.one,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minWidth: 0,
  },
  tagSlot: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: Spacing.one,
  },
});

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : null;
