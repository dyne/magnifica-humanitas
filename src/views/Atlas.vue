<script setup lang="ts">
import { activeLocale, localePath } from '../locale'
import { t as msg } from '../messages'
import { wasVisited } from '../local-state'
import ResumeInvitation from '../components/ResumeInvitation.vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { concepts, relations, concept, relationLabel } from '../reading'
import ReadingLink from '../components/ReadingLink.vue'
import SourceRefs from '../components/SourceRefs.vue'
const route = useRoute()
const router = useRouter()
const regions = computed(() => [
  { id: 'worth', question: msg('atlas.what_makes_a_person_worthy'), ids: ['dignity', 'rights', 'embodiment', 'care'] },
  { id: 'together', question: msg('atlas.how_do_people_live_well_together'), ids: ['common-good', 'subsidiarity', 'solidarity', 'justice', 'dialogue'] },
  { id: 'technology', question: msg('atlas.who_gets_to_decide_what_technology_is_for'), ids: ['technology-power', 'ai-limits', 'ai-governance', 'shared-goods', 'institutional-accountability'] },
  { id: 'future', question: msg('atlas.what_gives_people_a_future'), ids: ['work', 'distribution', 'family', 'exploitation', 'development'] },
  { id: 'judgment', question: msg('atlas.how_can_we_form_our_own_judgment'), ids: ['truth', 'education', 'freedom'] },
  { id: 'peace', question: msg('atlas.what_makes_peace_possible'), ids: ['peace', 'memory', 'hope'] },
  { id: 'foundations', question: msg('atlas.where_does_the_source_find_its_foundations'), ids: ['history', 'faith-foundations'] },
])
const selected = computed(() => concept(route.query.focus))
const edges = computed(() => selected.value ? relations.filter(r => r.from === selected.value!.id || r.to === selected.value!.id) : relations)
function focus(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  router.replace({ path: localePath('/atlas'), query: value ? { focus: value } : {} })
}
</script>
<template>
  <h1 tabindex="-1">{{ msg('atlas.explore_the_ideas_in_magnifica_humanitas') }}</h1><ResumeInvitation />
  <p class="idea">{{ msg('atlas.choose_a_concept_and_follow_its_connections') }}</p>
  <p>{{ msg('atlas.these_questions_are_editorial_groupings_of_the_source_s_ideas_eve') }}</p>
  <div class="regions">
    <section v-for="region in regions" :key="region.id" class="region" :aria-labelledby="region.id">
      <h2 :id="region.id">{{ region.question }}</h2>
      <p v-if="region.id === 'foundations'">{{ msg('atlas.optional_attributed_religious_foundations_and_historical_context') }}</p>
      <ul class="concept-links"><li v-for="id in region.ids" :key="id"><ReadingLink :id="`atlas-${id}`" :to="`/${activeLocale}/concepts/${id}`">{{ concept(id)?.title }}</ReadingLink><span v-if="wasVisited('concept', id)"> {{ msg('atlas.visited') }}</span></li></ul>
    </section>
  </div>
  <section aria-labelledby="connections">
    <h2 id="connections">{{ msg('atlas.explore_the_connections') }}</h2>
    <p>{{ msg('atlas.each_direction_is_an_editorial_interpretation_with_source_evidenc') }}</p>
    <label for="neighborhood">{{ msg('atlas.focus_on_a_concept') }}</label>
    <select id="neighborhood" :value="selected?.id ?? ''" @change="focus"><option value="">{{ msg('atlas.all_relationships') }}</option><option v-for="c in concepts" :key="c.id" :value="c.id">{{ c.title }}</option></select>
    <p v-if="route.query.focus && !selected" role="status">{{ msg('atlas.this_concept_is_unavailable_showing_all_relationships') }}</p>
    <p v-if="selected"><ReadingLink id="neighborhood-concept" :to="`/${activeLocale}/concepts/${selected.id}`">{{ msg('atlas.read_value', { value1: selected.title }) }}</ReadingLink> · <RouterLink :to="localePath('/atlas')">{{ msg('atlas.show_all_relationships') }}</RouterLink></p>
    <details v-if="selected" class="neighborhood-diagram"><summary>{{ msg('atlas.show_the_relationship_diagram') }}</summary>
      <svg :viewBox="`0 0 900 ${edges.length * 100}`" aria-hidden="true" focusable="false">
        <g v-for="(r, i) in edges" :key="r.id" :transform="`translate(0,${i * 100})`">
          <a :href="router.resolve(`/${activeLocale}/relations/${r.id}`).href" tabindex="-1" :data-relation="r.id">
            <path d="M 25 55 H 875 M 865 48 L 875 55 L 865 62" fill="none" stroke="currentColor" />
            <text x="25" y="24">{{ concept(r.from)?.title }}</text><text x="875" y="85" text-anchor="end">{{ concept(r.to)?.title }}</text>
            <text x="450" y="45" text-anchor="middle">{{ relationLabel(r.type) }}{{ r.placement === 'optional-foundations' ? msg('atlas.optional_foundations') : '' }}</text>
          </a>
        </g>
      </svg>
    </details>
    <ul class="relationships" :aria-label="msg('atlas.relationship_list')"><li v-for="r in edges" :key="r.id" :data-relation="r.id">
      <ReadingLink :id="`atlas-relation-${r.id}`" :to="`/${activeLocale}/relations/${r.id}`">{{ concept(r.from)?.title }} {{ relationLabel(r.type) }} {{ concept(r.to)?.title }}</ReadingLink>
      <p class="kind">{{ msg('atlas.editorial_relationshipvalue', { value1: r.placement === 'optional-foundations' ? msg('atlas.optional_theological_foundations') : '' }) }}</p>
      <p>{{ r.explanation.text }}</p><SourceRefs :refs="r.explanation.sourceRefs" :scope="`atlas-${r.id}`" />
    </li></ul>
  </section>
  <p class="actions"><RouterLink :to="localePath('/search')">{{ msg('atlas.search_this_reading') }}</RouterLink><RouterLink :to="localePath('/read')">{{ msg('atlas.read_in_source_order') }}</RouterLink></p>
</template>
