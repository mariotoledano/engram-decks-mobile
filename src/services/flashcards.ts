import { apiRequest } from '@/services/api-client';
import type { Flashcard } from '@/types/api';

export function listFlashcards(): Promise<Flashcard[]> {
  return apiRequest<Flashcard[]>('/api/v1/flashcards');
}
