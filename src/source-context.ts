import type { ReadingContextIndex } from './reading-types'
let pending: Promise<ReadingContextIndex> | undefined
export function loadContext() {
  pending ??= import('virtual:reading-context').then(module => module.default).catch(error => { pending = undefined; throw error })
  return pending
}

export async function waitForContext() { await pending?.catch(() => undefined) }
