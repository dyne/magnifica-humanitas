import type { ReadingContextIndex } from './reading-types'
import { delivery } from './reading'
import { activeLocale } from './locale'
let pending: Promise<ReadingContextIndex> | undefined
export function loadContext(locale = activeLocale.value) {
  pending = delivery.load(locale, 'context') as Promise<ReadingContextIndex>
  return pending
}
export async function waitForContext() { await pending?.catch(() => undefined) }
