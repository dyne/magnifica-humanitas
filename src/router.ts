import { createRouter, createWebHashHistory } from 'vue-router'
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
import { enterLocation } from './local-state'
import { scrollBehavior, beginNavigation } from './navigation'

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/en/atlas' },
    { path: '/en/atlas', component: Atlas, meta: { title: 'Explore the ideas' } },
    { path: '/en/about', component: About, meta: { title: 'About this reading' } },
    { path: '/en/concepts/:conceptId', component: Concept, meta: { title: 'Concept' } },
    { path: '/en/relations/:relationId', component: Relation, meta: { title: 'Relationship' } },
    { path: '/en/foundations/:conceptId', component: Foundation, meta: { title: 'Optional foundations' } },
    { path: '/en/source/:paragraphId', component: Source, meta: { title: 'Source context' } },
    { path: '/en/notes/:noteId', component: Note, meta: { title: 'Source note' } },
    { path: '/en/trails', component: Trails, meta: { title: 'Question-led trails' } },
    { path: '/en/trails/:trailId/steps/:stepId', component: Trail, meta: { title: 'Trail step' } },
    { path: '/en/trails/:trailId/end', component: TrailEnd, meta: { title: 'Trail ending' } },
    { path: '/en/read', component: Read, meta: { title: 'Read continuously' } },
    { path: '/en/search', component: Search, meta: { title: 'Search this reading' } },
    { path: '/en/saved', component: Saved, meta: { title: 'Saved places and recent path' } },
    { path: '/:pathMatch(.*)*', component: Unavailable, meta: { title: 'Link unavailable' } },
  ],
  scrollBehavior,
})
router.afterEach(to => { enterLocation(to); document.title = `${to.meta.title} · Magnifica Humanitas` })

router.beforeEach((_to, from) => { beginNavigation(from.matched.length === 0) })
