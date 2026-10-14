import type { ReadingEntry } from './reading-types'
import { delivery } from './reading'
import { activeLocale } from './locale'
let pending: Promise<ReadingEntry[]> | undefined
export function loadSequence(locale = activeLocale.value) {
  pending = delivery.load(locale, 'sequence') as Promise<ReadingEntry[]>
  return pending
}
export async function waitForSequence() { await pending?.catch(() => undefined) }
