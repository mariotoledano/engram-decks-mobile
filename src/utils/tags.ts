const TAG_PATTERN = /^[\p{L}\p{N} _-]+$/u;

export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const part of input.split(',')) {
    const tag = part.trim();
    if (!tag || seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

export function validateTags(tags: string[]): string | null {
  if (tags.length > 20) {
    return 'Puedes añadir hasta 20 etiquetas.';
  }

  for (const tag of tags) {
    if (tag.length > 40) {
      return 'Cada etiqueta puede tener hasta 40 caracteres.';
    }
    if (!TAG_PATTERN.test(tag)) {
      return 'Las etiquetas solo pueden incluir letras, números, espacios, guiones y guiones bajos.';
    }
  }

  return null;
}
