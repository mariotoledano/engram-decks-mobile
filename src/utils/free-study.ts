import type { Deck, Flashcard } from '@/types/api';
import { normalizeSearchText } from '@/utils/decks';
import { shuffleFlashcards } from '@/utils/flashcards';

export const FREE_STUDY_COUNT_MIN = 1;
export const FREE_STUDY_COUNT_MAX = 50;
export const FREE_STUDY_COUNT_DEFAULT = 25;

const TAG_NAME_RANK = 0;
const DECK_NAME_RANK = 1;
const DECK_DESCRIPTION_RANK = 2;

export interface StudySource {
  kind: 'tag' | 'deck';
  id: string;
  label: string;
}

export function studySourceKey(source: StudySource): string {
  return `${source.kind}:${source.id}`;
}

export function listStudySources(tags: string[], decks: Deck[], query: string): StudySource[] {
  const tagSources = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => ({ kind: 'tag' as const, id: tag, label: tag }));
  const deckSources = decks.map((deck) => ({
    kind: 'deck' as const,
    id: deck.id,
    label: deck.name,
    description: deck.description ?? '',
  }));
  const tokens = normalizeSearchText(query)
    .split(' ')
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    tagSources.sort((left, right) => compareLabel(left.label, right.label));
    deckSources.sort((left, right) => compareLabel(left.label, right.label));
    return [...tagSources, ...deckSources];
  }

  const ranked: { source: StudySource; rank: number }[] = [];

  for (const source of tagSources) {
    if (tokens.every((token) => normalizeSearchText(source.label).includes(token))) {
      ranked.push({ source, rank: TAG_NAME_RANK });
    }
  }

  for (const source of deckSources) {
    const rank = deckRank(normalizeSearchText(source.label), normalizeSearchText(source.description), tokens);
    if (rank !== null) {
      ranked.push({ source, rank });
    }
  }

  return ranked
    .sort((left, right) => left.rank - right.rank || compareLabel(left.source.label, right.source.label))
    .map((match) => match.source);
}

export function drawFreeStudyCards(
  cards: Flashcard[],
  tags: string[],
  deckIds: string[],
  count: number,
): Flashcard[] {
  const wantedTags = new Set(tags.map(normalizeTag).filter((tag) => tag.length > 0));
  const wantedDecks = new Set(deckIds.filter((id) => id.length > 0));
  if (wantedTags.size === 0 && wantedDecks.size === 0) {
    return [];
  }

  const pool = cards.filter((card) => matchesCard(card, wantedTags, wantedDecks));
  if (pool.length === 0) {
    return [];
  }

  const limit = Math.min(pool.length, clampCount(count));
  return shuffleFlashcards(pool).slice(0, limit);
}

function deckRank(name: string, description: string, tokens: string[]): number | null {
  let rank = DECK_NAME_RANK;

  for (const token of tokens) {
    if (name.includes(token)) {
      continue;
    }
    if (description.includes(token)) {
      rank = DECK_DESCRIPTION_RANK;
      continue;
    }
    return null;
  }

  return rank;
}

function matchesCard(card: Flashcard, tags: Set<string>, deckIds: Set<string>): boolean {
  if ((card.deckIds ?? []).some((id) => deckIds.has(id))) {
    return true;
  }
  return (card.tags ?? []).some((tag) => tags.has(normalizeTag(tag)));
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function clampCount(count: number): number {
  if (!Number.isFinite(count)) {
    return FREE_STUDY_COUNT_DEFAULT;
  }
  return Math.min(FREE_STUDY_COUNT_MAX, Math.max(FREE_STUDY_COUNT_MIN, Math.round(count)));
}

function compareLabel(left: string, right: string): number {
  return left.localeCompare(right, 'es');
}
