import { apiRequest } from '@/services/api-client';
import type { CreateFlashcardRequest, Flashcard, UpdateFlashcardRequest } from '@/types/api';

export function listFlashcards(deckId: string): Promise<Flashcard[]> {
  return apiRequest<Flashcard[]>(`/api/v1/decks/${encodeURIComponent(deckId)}/flashcards`);
}

export function getFlashcard(id: string): Promise<Flashcard> {
  return apiRequest<Flashcard>(`/api/v1/flashcards/${encodeURIComponent(id)}`);
}

export function createFlashcard(deckId: string, body: CreateFlashcardRequest): Promise<Flashcard> {
  return apiRequest<Flashcard>(`/api/v1/decks/${encodeURIComponent(deckId)}/flashcards`, {
    method: 'POST',
    body,
  });
}

export function updateFlashcard(id: string, body: UpdateFlashcardRequest): Promise<Flashcard> {
  return apiRequest<Flashcard>(`/api/v1/flashcards/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export function createUnlinkedFlashcard(body: CreateFlashcardRequest): Promise<Flashcard> {
  return apiRequest<Flashcard>('/api/v1/flashcards', {
    method: 'POST',
    body,
  });
}

export function listUnlinkedFlashcards(query: string): Promise<Flashcard[]> {
  const trimmed = query.trim();
  const suffix = trimmed ? `?q=${encodeURIComponent(trimmed)}` : '';
  return apiRequest<Flashcard[]>(`/api/v1/flashcards/unlinked${suffix}`);
}

export function unlinkFlashcard(deckId: string, cardId: string): Promise<void> {
  return apiRequest<void>(
    `/api/v1/decks/${encodeURIComponent(deckId)}/flashcards/${encodeURIComponent(cardId)}`,
    { method: 'DELETE' },
  );
}

export function deleteFlashcard(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/flashcards/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
