import type { Flashcard } from '@/types/api';

export interface StudyDraft {
  cards: Flashcard[];
  totalMatched: number;
  filterTags: string[];
}

let draft: StudyDraft | null = null;

export function setStudyDraft(value: StudyDraft): void {
  draft = value;
}

export function getStudyDraft(): StudyDraft | null {
  return draft;
}

export function updateStudyDraftCards(cards: Flashcard[]): void {
  if (draft) {
    draft = { ...draft, cards };
  }
}

export function clearStudyDraft(): void {
  draft = null;
}
