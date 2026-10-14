import { nextTick } from 'vue'
import type { RouterScrollBehavior } from 'vue-router'
import type { Caller } from './reading-types'
import { waitForContext } from './source-context'
let traversing = false
let navigating = false
let navigationVersion = 0
let navigationFocus: Element | null = null
window.addEventListener('popstate', () => { traversing = true })

export function savePosition(focusId?: string, force = false) {
  if (!force && (traversing || navigating)) return
  const active = document.activeElement as HTMLElement | null
  const previous = history.state?.mhReader
  history.replaceState({ ...history.state, mhReader: {
    top: Math.max(0, window.scrollY), focusId: focusId ?? (active?.id || previous?.focusId || 'page-heading'),
  } }, '')
}
let scrollTimer: ReturnType<typeof setTimeout>
window.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(() => savePosition(), 100) }, { passive: true })
window.addEventListener('pagehide', () => savePosition())

export function beginNavigation(initial: boolean) {
  if (!initial && !traversing) savePosition()
  clearTimeout(scrollTimer)
  navigationVersion++
  navigationFocus = document.activeElement
  navigating = true
}

export const scrollBehavior: RouterScrollBehavior = async (to, _from, savedPosition) => {
  const version = navigationVersion
  const initialFocus = navigationFocus
  const state = history.state
  const restore = state?.mhRestore ?? state?.mhReader
  const wasTraversal = traversing
  traversing = false
  await nextTick()
  if (to.path.startsWith('/en/source/') || to.path.startsWith('/en/notes/')) { await waitForContext(); await nextTick() }
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  if (version !== navigationVersion) return false
  navigating = false
  const active = document.activeElement
  // A reader may have deliberately focused a control while orientation waited.
  // Preserve that choice rather than moving focus or scroll after their action.
  if (active && active !== document.body && active !== initialFocus && active.isConnected) return false
  const heading = document.querySelector<HTMLElement>('main h1')
  if (heading) heading.id = 'page-heading'
  if (restore) {
    const target = document.getElementById(restore.focusId)
    ;(target ?? heading)?.focus({ preventScroll: true })
    return { top: Math.max(0, restore.top) }
  }
  if (wasTraversal && savedPosition) {
    heading?.focus({ preventScroll: true })
    return savedPosition
  }
  if (typeof to.query.at === 'string') {
    const block = document.getElementById(to.query.at)
    if (block) {
      block.focus({ preventScroll: true })
      return { el: block, top: 16 }
    }
  }
  if (_from.matched.length) heading?.focus({ preventScroll: true })
  return { top: 0 }
}

export function readCaller(): Caller | undefined {
  const caller = history.state?.mhCaller
  if (!caller || typeof caller.route !== 'string' || !caller.route.startsWith('/en/') ||
      typeof caller.label !== 'string' || typeof caller.focusId !== 'string' ||
      !Number.isFinite(caller.top) || caller.top < 0) return undefined
  return caller
}
