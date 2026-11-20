import type { Flashcard } from '@/types/api';
import { normalizeSearchText } from '@/utils/decks';

const FRONT_RANK = 0;
const BACK_RANK = 1;

function recentAt(card: Flashcard): number | null {
  const raw = card.updatedAt ?? card.createdAt;
  if (!raw) {
    return null;
  }
  const time = Date.parse(raw);
  return Number.isNaN(time) ? null : time;
}

export function compareFlashcardsByRecent(left: Flashcard, right: Flashcard): number {
  const leftTime = recentAt(left);
  const rightTime = recentAt(right);
  if (leftTime !== rightTime) {
    if (leftTime === null) {
      return 1;
    }
    if (rightTime === null) {
      return -1;
    }
    return rightTime - leftTime;
  }
  return left.id.localeCompare(right.id);
}

export function tagKey(tag: string): string {
  return tag.trim().toLowerCase();
}

function textRank(token: string, front: string, back: string): number | null {
  if (front.includes(token)) {
    return FRONT_RANK;
  }
  if (back.includes(token)) {
    return BACK_RANK;
  }
  return null;
}

function matchRank(card: Flashcard, tokens: string[]): number | null {
  const front = normalizeSearchText(card.front);
  const back = normalizeSearchText(card.back);
  let rank = FRONT_RANK;

  for (const token of tokens) {
    const fieldRank = textRank(token, front, back);
    if (fieldRank === null) {
      return null;
    }
    if (fieldRank > rank) {
      rank = fieldRank;
    }
  }

  return rank;
}

export function filterTagNames(tags: string[], query: string): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const tag of tags) {
    const trimmed = tag.trim();
    const key = tagKey(trimmed);
    if (key.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(trimmed);
  }

  const tokens = normalizeSearchText(query)
    .split(' ')
    .filter((token) => token.length > 0);
  const matched =
    tokens.length === 0
      ? unique
      : unique.filter((tag) => tokens.every((token) => normalizeSearchText(tag).includes(token)));

  return matched.sort((left, right) => left.localeCompare(right, 'es'));
}

export function filterFlashcardsByTags(cards: Flashcard[], tags: string[]): Flashcard[] {
  const wanted = new Set(tags.map(tagKey).filter((key) => key.length > 0));
  if (wanted.size === 0) {
    return cards;
  }

  return cards.filter((card) => (card.tags ?? []).some((tag) => wanted.has(tagKey(tag))));
}

export function filterFlashcardsByDecks(cards: Flashcard[], deckIds: string[]): Flashcard[] {
  const wanted = new Set(deckIds.filter((id) => id.length > 0));
  if (wanted.size === 0) {
    return cards;
  }

  return cards.filter((card) => (card.deckIds ?? []).some((id) => wanted.has(id)));
}

export function shuffleFlashcards(cards: Flashcard[]): Flashcard[] {
  const next = [...cards];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swap];
    next[swap] = current;
  }
  return next;
}

export function searchFlashcards(cards: Flashcard[], query: string): Flashcard[] {
  const tokens = normalizeSearchText(query).split(' ').filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return [...cards].sort(compareFlashcardsByRecent);
  }

  return cards
    .flatMap((card) => {
      const rank = matchRank(card, tokens);
      return rank === null ? [] : [{ card, rank }];
    })
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }
      return compareFlashcardsByRecent(left.card, right.card);
    })
    .map((match) => match.card);
}
