import type { Deck } from '@/types/api';

const TITLE_RANK = 0;
const TAG_RANK = 1;
const DESCRIPTION_RANK = 2;

function studiedAt(deck: Deck): number | null {
  if (!deck.lastTimeStudiedAt) {
    return null;
  }
  const time = Date.parse(deck.lastTimeStudiedAt);
  return Number.isNaN(time) ? null : time;
}

export function compareDecksByRecentStudy(left: Deck, right: Deck): number {
  const leftTime = studiedAt(left);
  const rightTime = studiedAt(right);
  if (leftTime === null && rightTime === null) {
    return 0;
  }
  if (leftTime === null) {
    return 1;
  }
  if (rightTime === null) {
    return -1;
  }
  return rightTime - leftTime;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/ +/g, ' ');
}

function tokenRank(token: string, name: string, tags: string[], description: string): number | null {
  if (name.includes(token)) {
    return TITLE_RANK;
  }
  if (tags.some((tag) => tag.includes(token))) {
    return TAG_RANK;
  }
  if (description.includes(token)) {
    return DESCRIPTION_RANK;
  }
  return null;
}

function matchRank(deck: Deck, tokens: string[]): number | null {
  const name = normalizeSearchText(deck.name);
  const tags = (deck.tags ?? []).map((tag) => normalizeSearchText(tag));
  const description = normalizeSearchText(deck.description ?? '');
  let rank = TITLE_RANK;

  for (const token of tokens) {
    const fieldRank = tokenRank(token, name, tags, description);
    if (fieldRank === null) {
      return null;
    }
    if (fieldRank > rank) {
      rank = fieldRank;
    }
  }

  return rank;
}

export function searchDecks(decks: Deck[], query: string): Deck[] {
  const tokens = normalizeSearchText(query).split(' ').filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return [...decks].sort(compareDecksByRecentStudy);
  }

  return decks
    .flatMap((deck) => {
      const rank = matchRank(deck, tokens);
      return rank === null ? [] : [{ deck, rank }];
    })
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }
      return compareDecksByRecentStudy(left.deck, right.deck);
    })
    .map((match) => match.deck);
}
