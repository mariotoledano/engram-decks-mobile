import type { Flashcard } from '@/types/api';
import { normalizeSearchText } from '@/utils/decks';

const TAG_RANK = 0;
const FRONT_RANK = 1;
const BACK_RANK = 2;

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

function tokenRank(token: string, tags: string[], front: string, back: string): number | null {
  if (tags.some((tag) => tag.includes(token))) {
    return TAG_RANK;
  }
  if (front.includes(token)) {
    return FRONT_RANK;
  }
  if (back.includes(token)) {
    return BACK_RANK;
  }
  return null;
}

function matchRank(card: Flashcard, tokens: string[]): number | null {
  const tags = (card.tags ?? []).map((tag) => normalizeSearchText(tag));
  const front = normalizeSearchText(card.front);
  const back = normalizeSearchText(card.back);
  let rank = TAG_RANK;

  for (const token of tokens) {
    const fieldRank = tokenRank(token, tags, front, back);
    if (fieldRank === null) {
      return null;
    }
    if (fieldRank > rank) {
      rank = fieldRank;
    }
  }

  return rank;
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
