import { apiRequest } from '@/services/api-client';
import type { CreateDeckRequest, Deck, PatchDeckRequest, UpdateDeckRequest } from '@/types/api';

export function listDecks(): Promise<Deck[]> {
  return apiRequest<Deck[]>('/api/v1/decks');
}

export function getDeck(id: string): Promise<Deck> {
  return apiRequest<Deck>(`/api/v1/decks/${encodeURIComponent(id)}`);
}

export function createDeck(body: CreateDeckRequest): Promise<Deck> {
  return apiRequest<Deck>('/api/v1/decks', { method: 'POST', body });
}

export function updateDeck(id: string, body: UpdateDeckRequest): Promise<Deck> {
  return apiRequest<Deck>(`/api/v1/decks/${encodeURIComponent(id)}`, { method: 'PUT', body });
}

export function patchDeck(id: string, body: PatchDeckRequest): Promise<Deck> {
  return apiRequest<Deck>(`/api/v1/decks/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}

export function deleteDeck(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/decks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
