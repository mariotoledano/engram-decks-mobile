import type { Href } from 'expo-router';

export function deckFormHref(id?: string): Href {
  if (!id) {
    return '/deck/form' as unknown as Href;
  }
  return { pathname: '/deck/form', params: { id } } as unknown as Href;
}

export function deckHref(id: string): Href {
  return { pathname: '/deck/[id]', params: { id } } as unknown as Href;
}

export function cardFormHref(deckId: string, cardId?: string): Href {
  return {
    pathname: '/deck/[id]/card-form',
    params: cardId ? { id: deckId, cardId } : { id: deckId },
  } as unknown as Href;
}

export function cardEditHref(cardId: string): Href {
  return { pathname: '/card-form', params: { cardId } } as unknown as Href;
}

export function unlinkedHref(): Href {
  return '/unlinked' as unknown as Href;
}

export function studyHref(deckId: string): Href {
  return { pathname: '/deck/[id]/study', params: { id: deckId } } as unknown as Href;
}

export function newSessionHref(): Href {
  return '/study/new' as unknown as Href;
}

export function sessionPreviewHref(): Href {
  return '/study/preview' as unknown as Href;
}

export function sessionStudyHref(): Href {
  return '/study/session' as unknown as Href;
}

export function maintenanceHref(): Href {
  return '/maintenance' as unknown as Href;
}

export function maintenanceCardsHref(): Href {
  return '/maintenance/cards' as unknown as Href;
}
