import { API_BASE_URL } from '@/constants/api';
import { ApiError, ConnectionError } from '@/services/api-client';

export const CONNECTION_MESSAGE =
  'No se pudo conectar con el servidor. Comprueba que la API está en marcha y que la URL base es alcanzable.';

const UNEXPECTED_MESSAGE = 'Ha ocurrido un error inesperado.';
const INVALID_DATA_MESSAGE = 'Hay datos que no son válidos.';
const NOT_FOUND_MESSAGE = 'No se ha encontrado lo que buscabas.';

/** Mensajes literales que devuelve la API, incluidos los de validación de campos. */
const API_MESSAGES: Record<string, string> = {
  'Validation failed': INVALID_DATA_MESSAGE,
  'Malformed request body': 'No se ha podido leer lo que se ha enviado.',
  'An unexpected error occurred': UNEXPECTED_MESSAGE,
  'Front must not be blank': 'El anverso no puede estar vacío.',
  'Front must be at most 5000 characters': 'El anverso puede tener como máximo 5000 caracteres.',
  'Back must not be blank': 'El reverso no puede estar vacío.',
  'Back must be at most 5000 characters': 'El reverso puede tener como máximo 5000 caracteres.',
  'Name must not be blank': 'El nombre no puede estar vacío.',
  'Name must be at most 120 characters': 'El nombre puede tener como máximo 120 caracteres.',
  'Description must be at most 2000 characters': 'La descripción puede tener como máximo 2000 caracteres.',
  'Tags must contain at most 20 items': 'Puedes asignar como máximo 20 etiquetas.',
  'Tag must not be blank': 'Una etiqueta no puede estar vacía.',
  'Tag must be at most 40 characters': 'Cada etiqueta puede tener como máximo 40 caracteres.',
  'Tag contains invalid characters':
    'Las etiquetas solo pueden incluir letras, números, espacios, guiones y guiones bajos.',
  'At least one flashcard is required': 'Selecciona al menos una tarjeta.',
  'A session can contain at most 200 flashcards': 'Una sesión puede incluir como máximo 200 tarjetas.',
  'Flashcard id must not be blank': 'Falta el identificador de una tarjeta.',
  'Flashcard ids are required': 'Falta el orden de las tarjetas.',
  'Flashcard order must list every card in the deck exactly once':
    'El orden tiene que incluir cada tarjeta del mazo una sola vez.',
  'A deck can order at most 5000 flashcards': 'Un mazo puede ordenar como máximo 5000 tarjetas.',
  'Limit is required': 'Indica cuántas tarjetas quieres estudiar.',
  'Limit must be at least 1': 'Elige al menos 1 tarjeta.',
  'Limit must be at most 200': 'Puedes estudiar como máximo 200 tarjetas a la vez.',
  'Deck ids must contain at most 50 items': 'Puedes elegir como máximo 50 mazos.',
  'Deck id must not be blank': 'Falta el identificador de un mazo.',
  'Query must be at most 200 characters': 'La búsqueda puede tener como máximo 200 caracteres.',
  'Cover type must not be null': 'Elige un tipo de portada.',
  'Cover value must not be blank': 'La portada no puede estar vacía.',
  'Cover value must be at most 100000 characters': 'La imagen de portada es demasiado grande.',
  'Cover must be a #RRGGBB color or a small JPEG, PNG, or WebP data URL':
    'La portada tiene que ser un color (por ejemplo #336699) o una imagen JPEG, PNG o WebP.',
  'Confirmation is required': 'Escribe BORRAR para confirmar.',
  'Confirmation must be BORRAR': 'Escribe BORRAR para confirmar.',
  'Id must not be blank': 'Falta un identificador.',
};

const API_MESSAGE_PATTERNS: ReadonlyArray<{ test: RegExp; message: string }> = [
  { test: /^Deck not found with id:/, message: 'No se ha encontrado el mazo.' },
  { test: /^Flashcard not found with id:/, message: 'No se ha encontrado la tarjeta.' },
  { test: /^Unknown deck id:/, message: 'No se ha encontrado uno de los mazos seleccionados.' },
];

function translateApiMessage(raw: string): string | null {
  const exact = API_MESSAGES[raw];
  if (exact) {
    return exact;
  }
  for (const pattern of API_MESSAGE_PATTERNS) {
    if (pattern.test.test(raw)) {
      return pattern.message;
    }
  }
  return null;
}

/** Los detalles de validación llegan como `campo: mensaje`. */
function translateDetail(detail: string): string | null {
  const exact = translateApiMessage(detail);
  if (exact) {
    return exact;
  }
  const separator = detail.indexOf(': ');
  if (separator === -1) {
    return null;
  }
  return translateApiMessage(detail.slice(separator + 2));
}

function uniqueMessages(messages: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const message of messages) {
    if (seen.has(message)) {
      continue;
    }
    seen.add(message);
    result.push(message);
  }
  return result;
}

function warnUnmapped(raw: string): void {
  if (__DEV__) {
    console.warn(`Mensaje de API sin traducción: ${raw}`);
  }
}

function fallbackForStatus(status: number): string {
  if (status === 404) {
    return NOT_FOUND_MESSAGE;
  }
  if (status === 400) {
    return INVALID_DATA_MESSAGE;
  }
  return UNEXPECTED_MESSAGE;
}

export function requestErrorMessage(error: unknown): string {
  if (error instanceof ConnectionError) {
    if (__DEV__) {
      return `${CONNECTION_MESSAGE} (${API_BASE_URL})`;
    }
    return CONNECTION_MESSAGE;
  }

  if (error instanceof ApiError) {
    const translatedDetails = uniqueMessages(
      error.details.flatMap((detail) => {
        const translated = translateDetail(detail);
        if (!translated) {
          warnUnmapped(detail);
          return [];
        }
        return [translated];
      }),
    );

    if (translatedDetails.length > 0) {
      return translatedDetails.join('\n');
    }

    const translated = translateApiMessage(error.message);
    if (translated) {
      return translated;
    }

    warnUnmapped(error.message);
    return fallbackForStatus(error.status);
  }

  return UNEXPECTED_MESSAGE;
}
