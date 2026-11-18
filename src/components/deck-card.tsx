import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
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
}

export function DeckCard({ deck }: DeckCardProps) {
  const tags = deck.tags ?? [];

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <DeckCoverArt cover={deck.cover} />
      <View style={styles.body}>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
    gap: Spacing.one,
    justifyContent: 'center',
  },
});
