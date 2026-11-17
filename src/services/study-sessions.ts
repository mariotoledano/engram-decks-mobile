import { apiRequest } from '@/services/api-client';
import type {
  Deck,
  PreviewStudySessionRequest,
  SaveStudySessionRequest,
  StudySessionPreview,
} from '@/types/api';

export function previewStudySession(body: PreviewStudySessionRequest): Promise<StudySessionPreview> {
  return apiRequest<StudySessionPreview>('/api/v1/study-sessions/preview', {
    method: 'POST',
    body,
  });
}

export function saveStudySession(body: SaveStudySessionRequest): Promise<Deck> {
  return apiRequest<Deck>('/api/v1/study-sessions', {
    method: 'POST',
    body,
  });
}
