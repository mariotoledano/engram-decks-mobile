import { apiRequest } from '@/services/api-client';
import type { Flashcard, UpdateFlashcardRequest } from '@/types/api';

export function listFlashcards(): Promise<Flashcard[]> {
  return apiRequest<Flashcard[]>('/api/v1/flashcards');
}

export function getFlashcard(id: string): Promise<Flashcard> {
  return apiRequest<Flashcard>(`/api/v1/flashcards/${encodeURIComponent(id)}`);
}

export function updateFlashcard(id: string, body: UpdateFlashcardRequest): Promise<Flashcard> {
  return apiRequest<Flashcard>(`/api/v1/flashcards/${encodeURIComponent(id)}`, { method: 'PUT', body });
}

export function listFlashcardsByDeck(deckId: string): Promise<Flashcard[]> {
  return apiRequest<Flashcard[]>(`/api/v1/decks/${encodeURIComponent(deckId)}/flashcards`);
}
