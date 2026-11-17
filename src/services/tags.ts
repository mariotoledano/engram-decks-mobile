import { apiRequest } from '@/services/api-client';

export function listTags(): Promise<string[]> {
  return apiRequest<string[]>('/api/v1/tags');
}
