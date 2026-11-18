export type DeckCoverType = 'COLOR' | 'IMAGE';

export interface DeckCover {
  type: DeckCoverType;
  value: string;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  cover?: DeckCover;
  createdAt?: string;
  updatedAt?: string;
  lastTimeStudiedAt?: string;
}

export interface Flashcard {
  id: string;
  deckIds: string[];
  front: string;
  back: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDeckRequest {
  name: string;
  description?: string;
  tags?: string[];
  cover?: DeckCover;
}

export interface UpdateDeckRequest {
  name: string;
  description?: string;
  tags?: string[];
  cover?: DeckCover;
}

export interface PatchDeckRequest {
  name?: string;
  description?: string;
  tags?: string[];
  cover?: DeckCover;
}

export interface CreateFlashcardRequest {
  front: string;
  back: string;
  deckIds?: string[];
  tags?: string[];
}

export interface UpdateFlashcardRequest {
  front: string;
  back: string;
  deckIds: string[];
  tags?: string[];
}

export interface PatchFlashcardRequest {
  front?: string;
  back?: string;
  tags?: string[];
}

export interface ErrorResponse {
  timestamp?: string;
  status?: number;
  message?: string;
  details?: string[];
}

export type TagMatch = 'ANY' | 'ALL';

export interface PreviewStudySessionRequest {
  tags?: string[];
  match?: TagMatch;
  limit: number;
  shuffle?: boolean;
  deckIds?: string[];
  query?: string;
}

export interface StudySessionPreview {
  cards: Flashcard[];
  totalMatched: number;
}

export interface SaveStudySessionRequest {
  name: string;
  description?: string;
  tags?: string[];
  flashcardIds: string[];
}

export interface MaintenanceSummary {
  deckCount: number;
  flashcardCount: number;
  unlinkedCount: number;
  tagCount: number;
}

export interface ConfirmWipeRequest {
  confirm: 'BORRAR';
}
