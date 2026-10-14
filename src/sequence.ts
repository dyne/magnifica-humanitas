import type { ReadingEntry } from './reading-types'
let pending: Promise<ReadingEntry[]> | undefined
export function loadSequence() {
  pending ??= import('virtual:reading-sequence').then(module => module.default).catch(error => { pending = undefined; throw error })
  return pending
}
export async function waitForSequence() { await pending?.catch(() => undefined) }
