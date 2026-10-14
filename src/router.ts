import locales from 'virtual:locale-registry'
import { createRouter, createWebHashHistory, isNavigationFailure, NavigationFailureType } from 'vue-router'
import Atlas from './views/Atlas.vue'
import About from './views/About.vue'
import Unavailable from './views/Unavailable.vue'
import Concept from './views/Concept.vue'
import Relation from './views/Relation.vue'
import Foundation from './views/Foundation.vue'
import Source from './views/Source.vue'
import Note from './views/Note.vue'
import Trails from './views/Trails.vue'
import Trail from './views/Trail.vue'
import TrailEnd from './views/TrailEnd.vue'
import Read from './views/Read.vue'
import Search from './views/Search.vue'
import Saved from './views/Saved.vue'
import { activateReading, cancelReadingActivation } from './reading'
import { initializeReadingState, localStatus } from './local-state'
import { t, type MessageKey } from './messages'
import { resolveLocaleRoute } from '../scripts/locales.mjs'
import { enterLocation } from './local-state'
import { scrollBehavior, beginNavigation, cancelNavigation } from './navigation'

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: to => resolveLocaleRoute(to.fullPath, navigator, locales) },
    { path: '/:locale/atlas', component: Atlas, meta: { title: 'route.explore_the_ideas' } },
    { path: '/:locale/about', component: About, meta: { title: 'route.about_this_reading' } },
    { path: '/:locale/concepts/:conceptId', component: Concept, meta: { title: 'route.concept' } },
    { path: '/:locale/relations/:relationId', component: Relation, meta: { title: 'route.relationship' } },
    { path: '/:locale/foundations/:conceptId', component: Foundation, meta: { title: 'route.optional_foundations' } },
    { path: '/:locale/source/:paragraphId', component: Source, meta: { title: 'route.source_context' } },
    { path: '/:locale/notes/:noteId', component: Note, meta: { title: 'route.source_note' } },
    { path: '/:locale/trails', component: Trails, meta: { title: 'route.question-led_trails' } },
    { path: '/:locale/trails/:trailId/steps/:stepId', component: Trail, meta: { title: 'route.trail_step' } },
    { path: '/:locale/trails/:trailId/end', component: TrailEnd, meta: { title: 'route.trail_ending' } },
    { path: '/:locale/read', component: Read, meta: { title: 'route.read_continuously' } },
    { path: '/:locale/search', component: Search, meta: { title: 'route.search_this_reading' } },
    { path: '/:locale/saved', component: Saved, meta: { title: 'route.saved_places_and_recent_path' } },
    { path: '/:pathMatch(.*)*', component: Unavailable, meta: { title: 'route.link_unavailable' } },
  ],
  scrollBehavior,
})
const navigationTokens = new WeakMap<object, number>()
router.afterEach((to, _from, failure) => {
  if (failure) {
    if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
      // Duplicate routes skip beforeEach but still supersede any pending route.
      cancelReadingActivation()
      cancelNavigation()
      return
    }
    const token = navigationTokens.get(to)
    if (token !== undefined) cancelNavigation(token)
    return
  }
  enterLocation(to)
  document.title = t('concept.value_magnifica_humanitas', { value1: t(to.meta.title as MessageKey) })
})

router.beforeEach(async (to, from) => {
  const destination = resolveLocaleRoute(to.fullPath, navigator, locales)
  if (destination !== to.fullPath) return destination
  const locale = String(to.params.locale ?? 'en')
  const token = beginNavigation(from.matched.length === 0)
  navigationTokens.set(to, token)
  try {
    if (!await activateReading(locale)) return false
    initializeReadingState()
  } catch (error) {
    cancelNavigation(token)
    if (!from.matched.length) throw error
    localStatus.value = t('load.locale_error')
    return false
  }
})
