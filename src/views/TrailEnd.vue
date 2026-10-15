<script setup lang="ts">
import { activeLocale, localePath } from '../locale'
import { t as msg } from '../messages'
import SavePlace from '../components/SavePlace.vue'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { concept, trail } from '../reading'
import { wasVisited } from '../local-state'
import Reflection from '../components/Reflection.vue'
import ProseBlock from '../components/ProseBlock.vue'
import ReadingLink from '../components/ReadingLink.vue'
import Unavailable from './Unavailable.vue'
const route = useRoute()
const current = computed(() => trail(route.params.trailId))
const visited = computed(() => current.value?.steps.filter(s => wasVisited('trail', current.value!.id, s.id)) ?? [])
watch([current, () => route.fullPath], ([t]) => { document.title = msg('concept.value_magnifica_humanitas', { value1: t ? msg('trailend.trail_ending_value', { value1: t.title }) : msg('route.link_unavailable') }) }, { immediate: true, flush: 'post' })
</script>
<template>
  <template v-if="current">
    <nav class="breadcrumbs" :aria-label="msg('about.breadcrumb')"><RouterLink :to="localePath('/trails')">{{ msg('app.trails') }}</RouterLink><span aria-current="page">{{ msg('trailend.value_ending', { value1: current.title }) }}</span></nav>
    <h1 tabindex="-1">{{ msg('trailend.a_place_to_stop') }}</h1><SavePlace /><p>{{ msg('trailend.value_end_of_this_value_step_trail', { value1: current.title, value2: current.steps.length }) }}</p>
    <ProseBlock :block="current.ending" :scope="`${current.id}-ending`" />
    <Reflection :key="current.reflection.id" :reflection="current.reflection" />
    <h2>{{ msg('trailend.places_opened') }}</h2>
    <p v-if="!visited.length">{{ msg('trailend.no_trail_steps_are_recorded_as_opened_on_this_device_or_in_this_t') }}</p>
    <ul v-else><li v-for="s in visited" :key="s.id"><ReadingLink :id="`end-${s.id}`" :to="`/${activeLocale}/concepts/${s.conceptId}`">{{ concept(s.conceptId)?.title }}</ReadingLink></li></ul>
    <p>{{ msg('trailend.visits_are_not_evidence_of_understanding_saved_places_and_visits_') }}</p>
    <p v-if="current.optionalConceptIds.length">{{ msg('trailend.optional_companion_concepts') }} <ReadingLink v-for="id in current.optionalConceptIds" :key="id" :id="`${current.id}-end-optional-${id}`" :to="`/${activeLocale}/concepts/${id}`">{{ concept(id)?.title }}</ReadingLink></p>
    <p>{{ msg('trailend.related_questions') }} <ReadingLink v-for="id in current.relatedTrailIds" :key="id" :id="`${current.id}-end-related-${id}`" :to="`/${activeLocale}/trails/${id}/steps/${trail(id)?.steps[0].id}`">{{ trail(id)?.question }}</ReadingLink></p>
    <p class="actions"><RouterLink :to="localePath('/saved')">{{ msg('saved.saved_places_and_recent_path') }}</RouterLink><ReadingLink :id="`${current.id}-restart`" :to="`/${activeLocale}/trails/${current.id}/steps/${current.steps[0].id}`">{{ msg('trailend.restart_this_trail') }}</ReadingLink><RouterLink :to="localePath('/atlas')">{{ msg('about.return_to_the_atlas') }}</RouterLink></p>
  </template>
  <Unavailable v-else />
</template>
