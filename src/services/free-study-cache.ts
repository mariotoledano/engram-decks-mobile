import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Flashcard } from '@/types/api';

const STORAGE_KEY = 'engram.free-study-deck';

export async function loadFreeStudyDeck(): Promise<Flashcard[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parseDeck(raw);
  } catch {
    return null;
  }
}

export function saveFreeStudyDeck(cards: Flashcard[]): Promise<void> {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function clearFreeStudyDeck(): Promise<void> {
  return AsyncStorage.removeItem(STORAGE_KEY);
}

function parseDeck(raw: string): Flashcard[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) {
    return null;
  }

  const cards = parsed.filter(isFlashcard);
  return cards.length > 0 ? cards : null;
}

function isFlashcard(value: unknown): value is Flashcard {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const card = value as Flashcard;
  return (
    typeof card.id === 'string' &&
    card.id.length > 0 &&
    typeof card.front === 'string' &&
    typeof card.back === 'string' &&
    Array.isArray(card.deckIds) &&
    card.deckIds.every((id) => typeof id === 'string') &&
    (card.tags === undefined || (Array.isArray(card.tags) && card.tags.every((tag) => typeof tag === 'string')))
  );
}
