import type { CommonKey } from './zh.ts'

/** nl base dictionary for the common namespace, checked complete against the zh key set. */
export const nl = {
  'ok': 'OK',
  'cancel': 'Annuleren',
  'close': 'Sluiten',
  'copy': 'Kopiëren',
  'copied': 'Gekopieerd',
  'retry': 'Opnieuw proberen',
  'loading': 'Laden…',
  'load.failed': 'Laden mislukt',
  'submit': 'Versturen',
  'submitting': 'Versturen…',
  'next': 'Volgende',
  'previous': 'Vorige',
  'skip': 'Overslaan',
  'delete': 'Verwijderen',
  'edit': 'Bewerken',
  'save': 'Opslaan',
  'search': 'Zoeken',
  'more': 'Meer',
  'collapse': 'Inklappen',
  'expand': 'Uitklappen',
  'back': 'Terug',
  'unknown': 'Onbekend',
  'none': 'Geen',
  'truncated': 'Ingekort',
} satisfies Record<CommonKey, string>
