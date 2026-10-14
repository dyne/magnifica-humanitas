import { nextTick } from 'vue'
import type { RouterScrollBehavior } from 'vue-router'
import type { Caller } from './reading-types'
import { waitForContext } from './source-context'
import { waitForSequence } from './sequence'
import { settleLocation, available, localStatus, describeLocation, routeLocation, locationKey } from './local-state'
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
  settleLocation()
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
  if (to.path === '/en/read' || to.path === '/en/search') { await waitForSequence(); await nextTick() }
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  if (version !== navigationVersion) return false
  navigating = false
  // Editing an in-place query or neighborhood retains the control and scroll.
  // History traversal still restores its recorded destination below.
  if (!wasTraversal && to.path === _from.path && ['/en/search', '/en/atlas'].includes(to.path)) return false
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
  const resume = state?.mhResume
  const destination = routeLocation(to)
  if (resume && available(resume) && destination && locationKey(destination, false) === locationKey(resume, false)) {
    const target = (resume.blockId ? document.getElementById(resume.blockId) : null) ?? heading
    target?.focus({ preventScroll: true })
    localStatus.value = `Returned to ${describeLocation(resume)}.`
    await nextTick()
    const offset = target && resume.blockId ? Math.min(resume.offset, Math.max(0, target.offsetHeight - 1)) : 0
    return { top: Math.max(0, (target?.getBoundingClientRect().top ?? 0) + window.scrollY + offset - 16) }
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
