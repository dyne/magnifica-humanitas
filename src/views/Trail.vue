<script setup lang="ts">
import { activeLocale, localePath } from '../locale'
import { t as msg } from '../messages'
import SavePlace from '../components/SavePlace.vue'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { concept, trail } from '../reading'
import ConceptBody from '../components/ConceptBody.vue'
import ProseBlock from '../components/ProseBlock.vue'
import ReadingLink from '../components/ReadingLink.vue'
import ReturnLink from '../components/ReturnLink.vue'
import Unavailable from './Unavailable.vue'
const route = useRoute()
const currentTrail = computed(() => trail(route.params.trailId))
const stepIndex = computed(() => currentTrail.value?.steps.findIndex(s => s.id === route.params.stepId) ?? -1)
const step = computed(() => currentTrail.value?.steps[stepIndex.value])
const current = computed(() => concept(step.value?.conceptId))
watch(() => route.fullPath, () => {
  document.title = msg('concept.value_magnifica_humanitas', { value1: current.value?.title ?? msg('route.link_unavailable') })
}, { immediate: true, flush: 'post' })
const nextRoute = computed(() => {
  const t = currentTrail.value!
  const next = t.steps[stepIndex.value + 1]
  return next ? `/${activeLocale.value}/trails/${t.id}/steps/${next.id}` : `/${activeLocale.value}/trails/${t.id}/end`
})
</script>
<template>
  <template v-if="currentTrail && step && current">
    <nav class="breadcrumbs" :aria-label="msg('about.breadcrumb')"><RouterLink :to="localePath('/trails')">{{ msg('app.trails') }}</RouterLink><span>{{ currentTrail.title }}</span><span aria-current="page">{{ current.title }}</span></nav>
    <h1 tabindex="-1">{{ current.title }}</h1><SavePlace />
    <p>{{ msg('trail.step_value_of_value_value', { value1: stepIndex + 1, value2: currentTrail.steps.length, value3: currentTrail.title }) }}</p>
    <ConceptBody :concept="current" :scope="`trail-${step.id}`" />
    <h2>{{ stepIndex + 1 === currentTrail.steps.length ? msg('trail.bring_the_distinction_together') : msg('trail.where_the_argument_leads') }}</h2>
    <ProseBlock :block="step.transition" :scope="`${step.id}-transition`" />
    <nav class="actions" :aria-label="msg('trail.trail_steps')">
      <ReadingLink v-if="stepIndex > 0" :id="`${step.id}-previous`" :to="`/${activeLocale}/trails/${currentTrail.id}/steps/${currentTrail.steps[stepIndex-1].id}`">{{ msg('trail.previous_value', { value1: concept(currentTrail.steps[stepIndex-1].conceptId)?.title }) }}</ReadingLink>
      <ReadingLink :id="`${step.id}-next`" :to="nextRoute">{{ stepIndex + 1 === currentTrail.steps.length ? msg('trail.reach_the_trail_ending') : msg('trail.next_value', { value1: concept(currentTrail.steps[stepIndex+1].conceptId)?.title }) }}</ReadingLink>
      <ReadingLink :id="`${step.id}-skip`" :to="nextRoute">{{ msg('trail.skip_this_step') }}</ReadingLink>
      <ReadingLink :id="`${step.id}-concept`" :to="`/${activeLocale}/concepts/${current.id}`">{{ msg('trail.open_full_concept_value', { value1: current.title }) }}</ReadingLink>
    </nav>
    <ReturnLink /><RouterLink :to="localePath('/trails')">{{ msg('trail.return_to_trails') }}</RouterLink>
  </template>
  <Unavailable v-else />
</template>
