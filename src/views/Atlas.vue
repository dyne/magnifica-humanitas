<script setup lang="ts">
import { wasVisited } from '../local-state'
import ResumeInvitation from '../components/ResumeInvitation.vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { concepts, relations, concept, relationLabel } from '../reading'
import ReadingLink from '../components/ReadingLink.vue'
import SourceRefs from '../components/SourceRefs.vue'
const route = useRoute()
const router = useRouter()
const regions = [
  { id: 'worth', question: 'What makes a person worthy?', ids: ['dignity', 'rights', 'embodiment', 'care'] },
  { id: 'together', question: 'How do people live well together?', ids: ['common-good', 'subsidiarity', 'solidarity', 'justice', 'dialogue'] },
  { id: 'technology', question: 'Who gets to decide what technology is for?', ids: ['technology-power', 'ai-limits', 'ai-governance', 'shared-goods', 'institutional-accountability'] },
  { id: 'future', question: 'What gives people a future?', ids: ['work', 'distribution', 'family', 'exploitation', 'development'] },
  { id: 'judgment', question: 'How can we form our own judgment?', ids: ['truth', 'education', 'freedom'] },
  { id: 'peace', question: 'What makes peace possible?', ids: ['peace', 'memory', 'hope'] },
  { id: 'foundations', question: 'Where does the source find its foundations?', ids: ['history', 'faith-foundations'] },
]
const selected = computed(() => concept(route.query.focus))
const edges = computed(() => selected.value ? relations.filter(r => r.from === selected.value!.id || r.to === selected.value!.id) : relations)
function focus(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  router.replace({ path: '/en/atlas', query: value ? { focus: value } : {} })
}
</script>
<template>
  <h1 tabindex="-1">Explore the ideas in Magnifica Humanitas</h1><ResumeInvitation />
  <p class="idea">Choose a concept and follow its connections.</p>
  <p>These questions are editorial groupings of the source’s ideas. Every concept opens directly; the connections below explain why ideas belong together.</p>
  <div class="regions">
    <section v-for="region in regions" :key="region.id" class="region" :aria-labelledby="region.id">
      <h2 :id="region.id">{{ region.question }}</h2>
      <p v-if="region.id === 'foundations'">Optional, attributed religious foundations and historical context.</p>
      <ul class="concept-links"><li v-for="id in region.ids" :key="id"><ReadingLink :id="`atlas-${id}`" :to="`/en/concepts/${id}`">{{ concept(id)?.title }}</ReadingLink><span v-if="wasVisited('concept', id)"> · Visited</span></li></ul>
    </section>
  </div>
  <section aria-labelledby="connections">
    <h2 id="connections">Explore the connections</h2>
    <p>Each direction is an editorial interpretation with source evidence. The list is the complete navigation path; the optional diagram shows the same links in a focused neighborhood. Position and line length carry no measure of importance.</p>
    <label for="neighborhood">Focus on a concept</label>
    <select id="neighborhood" :value="selected?.id ?? ''" @change="focus"><option value="">All relationships</option><option v-for="c in concepts" :key="c.id" :value="c.id">{{ c.title }}</option></select>
    <p v-if="route.query.focus && !selected" role="status">This concept is unavailable. Showing all relationships.</p>
    <p v-if="selected"><ReadingLink id="neighborhood-concept" :to="`/en/concepts/${selected.id}`">Read {{ selected.title }}</ReadingLink> · <RouterLink to="/en/atlas">Show all relationships</RouterLink></p>
    <details v-if="selected" class="neighborhood-diagram"><summary>Show the relationship diagram</summary>
      <svg :viewBox="`0 0 900 ${edges.length * 100}`" aria-hidden="true" focusable="false">
        <g v-for="(r, i) in edges" :key="r.id" :transform="`translate(0,${i * 100})`">
          <a :href="router.resolve(`/en/relations/${r.id}`).href" tabindex="-1" :data-relation="r.id">
            <path d="M 25 55 H 875 M 865 48 L 875 55 L 865 62" fill="none" stroke="currentColor" />
            <text x="25" y="24">{{ concept(r.from)?.title }}</text><text x="875" y="85" text-anchor="end">{{ concept(r.to)?.title }}</text>
            <text x="450" y="45" text-anchor="middle">{{ relationLabel(r.type) }}{{ r.placement === 'optional-foundations' ? ' · optional foundations' : '' }}</text>
          </a>
        </g>
      </svg>
    </details>
    <ul class="relationships" aria-label="Relationship list"><li v-for="r in edges" :key="r.id" :data-relation="r.id">
      <ReadingLink :id="`atlas-relation-${r.id}`" :to="`/en/relations/${r.id}`">{{ concept(r.from)?.title }} {{ relationLabel(r.type) }} {{ concept(r.to)?.title }}</ReadingLink>
      <p class="kind">Editorial relationship{{ r.placement === 'optional-foundations' ? ' · Optional theological foundations' : '' }}</p>
      <p>{{ r.explanation.text }}</p><SourceRefs :refs="r.explanation.sourceRefs" :scope="`atlas-${r.id}`" />
    </li></ul>
  </section>
  <p class="actions"><RouterLink to="/en/search">Search this reading</RouterLink><RouterLink to="/en/read">Read in source order</RouterLink></p>
</template>
