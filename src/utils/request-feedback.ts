import { API_BASE_URL } from '@/constants/api';
import { ApiError, ConnectionError } from '@/services/api-client';

export const CONNECTION_MESSAGE =
  'No se pudo conectar con el servidor. Comprueba que la API está en marcha y que la URL base es alcanzable.';

export function requestErrorMessage(error: unknown): string {
  if (error instanceof ConnectionError) {
    if (__DEV__) {
      return `${CONNECTION_MESSAGE} (${API_BASE_URL})`;
    }
    return CONNECTION_MESSAGE;
  }

  if (error instanceof ApiError) {
    const details = error.details.length > 0 ? `\n${error.details.join('\n')}` : '';
    if (error.message.startsWith('Request failed')) {
      return `La solicitud ha fallado (${error.status}).${details}`;
    }
    return `${error.message}${details}`;
  }

  return 'Ha ocurrido un error inesperado.';
}
