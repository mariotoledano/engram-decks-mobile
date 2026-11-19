import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';

import { DeckIcon } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Deck, DeckCover } from '@/types/api';

const COVER_WIDTH = 64;

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
}

function cardCountLabel(count: number): string {
  return count === 1 ? '1 carta' : `${count} cartas`;
}

export function DeckCard({ deck, href, onPress }: DeckCardProps) {
  const theme = useTheme();
  const tags = deck.tags ?? [];
  const cardCount = deck.cardCount ?? 0;

  const card = (
    <ThemedView type="backgroundElement" style={styles.card}>
      <DeckCoverArt cover={deck.cover} />
      <View style={styles.body}>
        <View style={styles.copy}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {deck.name}
          </ThemedText>
          {deck.description ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {deck.description}
            </ThemedText>
          ) : null}
          {tags.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {tags.join(' · ')}
            </ThemedText>
          ) : null}
        </View>
        <View accessibilityLabel={cardCountLabel(cardCount)} style={styles.count}>
          <ThemedText type="small" themeColor="textSecondary">
            {cardCount}
          </ThemedText>
          <DeckIcon color={theme.textSecondary} size={14} />
        </View>
      </View>
    </ThemedView>
  );

  const pressable = (action?: () => void, role: 'button' | 'link' = 'button') => (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={deck.name}
      onPress={action}
      style={({ pressed }) => [
        styles.pressable,
        Platform.OS === 'web' ? styles.web : null,
        pressed ? styles.pressed : null,
      ]}>
      <View pointerEvents="none" style={styles.inner}>
        {card}
      </View>
    </Pressable>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        {pressable(undefined, 'link')}
      </Link>
    );
  }

  if (!onPress) {
    return card;
  }

  return pressable(onPress, 'button');
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  inner: {
    width: '100%',
  },
  web: {
    cursor: 'pointer',
  },
  pressed: {
    opacity: 0.85,
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
  cover: {
    width: COVER_WIDTH,
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
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  copy: {
    gap: Spacing.one,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: Spacing.one,
  },
});
