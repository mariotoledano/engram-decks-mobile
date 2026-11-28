/** Selección vacía estable, para no reordenar la lista fuera del modo de edición. */
export const EMPTY_SELECTION: ReadonlySet<string> = new Set();

/** Lo seleccionado va primero, en el orden en que se eligió: la última elección queda al final del grupo. */
export function pinSelectedFirst<T>(
  items: readonly T[],
  selectedIds: ReadonlySet<string>,
  idOf: (item: T) => string,
): readonly T[] {
  if (selectedIds.size === 0) {
    return items;
  }

  const byId = new Map(items.map((item) => [idOf(item), item]));
  const selected: T[] = [];
  for (const id of selectedIds) {
    const item = byId.get(id);
    if (item) {
      selected.push(item);
    }
  }
  if (selected.length === 0) {
    return items;
  }

  const alreadyPinned = selected.every((item, index) => items[index] === item);
  if (alreadyPinned) {
    return items;
  }

  const rest = items.filter((item) => !selectedIds.has(idOf(item)));
  return selected.concat(rest);
}

export function sameMembers(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const seen = new Set(left);
  if (seen.size !== left.length) {
    return false;
  }
  return right.every((id) => seen.has(id));
}

export function sameOrder(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function pinSetChanged(previous: ReadonlySet<string>, next: ReadonlySet<string>): boolean {
  if (previous.size !== next.size) {
    return true;
  }
  for (const id of previous) {
    if (!next.has(id)) {
      return true;
    }
  }
  return false;
}

function contentStart(headerHeight: number, gap: number): number {
  return headerHeight > 0 ? headerHeight + gap : 0;
}

function heightOf(heights: ReadonlyMap<string, number>): ((id: string) => number) | null {
  let sum = 0;
  let count = 0;
  for (const height of heights.values()) {
    if (height > 0) {
      sum += height;
      count += 1;
    }
  }
  if (count === 0) {
    return null;
  }
  const fallback = sum / count;
  return (id: string) => heights.get(id) ?? fallback;
}

function topOf(
  ids: readonly string[],
  targetId: string,
  measure: (id: string) => number,
  gap: number,
  headerHeight: number,
): number | null {
  let y = contentStart(headerHeight, gap);
  for (const id of ids) {
    if (id === targetId) {
      return y;
    }
    y += measure(id) + gap;
  }
  return null;
}

/**
 * Nuevo offset para que, al subir lo seleccionado, la vista siga en el mismo tramo.
 * Devuelve null si todavía no hay ninguna altura medida.
 */
export function scrollOffsetAfterReorder(input: {
  oldIds: readonly string[];
  newIds: readonly string[];
  heights: ReadonlyMap<string, number>;
  gap: number;
  headerHeight: number;
  scrollY: number;
  prevPinned: ReadonlySet<string>;
  nextPinned: ReadonlySet<string>;
}): number | null {
  const { oldIds, newIds, heights, gap, headerHeight, scrollY, prevPinned, nextPinned } = input;
  if (scrollY <= 0.5) {
    return 0;
  }
  const measure = heightOf(heights);
  if (measure == null) {
    return null;
  }

  let y = contentStart(headerHeight, gap);
  let anchorId: string | null = null;
  let anchorOldTop = 0;

  for (const id of oldIds) {
    const height = measure(id);
    if (y + height > scrollY + 0.5) {
      const becamePinned = !prevPinned.has(id) && nextPinned.has(id);
      const leftPin = prevPinned.has(id) && !nextPinned.has(id);
      if (!becamePinned) {
        if (!leftPin) {
          anchorId = id;
          anchorOldTop = y;
          break;
        }
        const newTop = topOf(newIds, id, measure, gap, headerHeight);
        if (newTop == null) {
          return null;
        }
        if (newTop <= y) {
          anchorId = id;
          anchorOldTop = y;
          break;
        }
      }
    }
    y += height + gap;
  }

  if (anchorId == null) {
    return scrollY;
  }

  const newTop = topOf(newIds, anchorId, measure, gap, headerHeight);
  if (newTop == null) {
    return null;
  }
  return Math.max(0, newTop - (anchorOldTop - scrollY));
}
