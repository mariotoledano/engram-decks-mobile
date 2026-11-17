import { apiRequest } from '@/services/api-client';
import type { ConfirmWipeRequest, Flashcard, MaintenanceSummary } from '@/types/api';

const WIPE: ConfirmWipeRequest = { confirm: 'BORRAR' };

export function getMaintenanceSummary(): Promise<MaintenanceSummary> {
  return apiRequest<MaintenanceSummary>('/api/v1/maintenance/summary');
}

export function listMaintenanceFlashcards(query: string, tag: string): Promise<Flashcard[]> {
  const trimmedQuery = query.trim();
  const trimmedTag = tag.trim();
  const parts: string[] = [];
  if (trimmedQuery) {
    parts.push(`q=${encodeURIComponent(trimmedQuery)}`);
  }
  if (trimmedTag) {
    parts.push(`tag=${encodeURIComponent(trimmedTag)}`);
  }
  const suffix = parts.length > 0 ? `?${parts.join('&')}` : '';
  return apiRequest<Flashcard[]>(`/api/v1/maintenance/flashcards${suffix}`);
}

export function deleteAllDecks(): Promise<void> {
  return apiRequest<void>('/api/v1/maintenance/decks', { method: 'DELETE', body: WIPE });
}

export function deleteAllFlashcards(): Promise<void> {
  return apiRequest<void>('/api/v1/maintenance/flashcards', { method: 'DELETE', body: WIPE });
}

export function deleteUnlinkedFlashcards(): Promise<void> {
  return apiRequest<void>('/api/v1/maintenance/unlinked', { method: 'DELETE', body: WIPE });
}
