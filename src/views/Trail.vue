<script setup lang="ts">
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
  document.title = `${current.value?.title ?? 'Link unavailable'} · Magnifica Humanitas`
}, { immediate: true })
const nextRoute = computed(() => {
  const t = currentTrail.value!
  const next = t.steps[stepIndex.value + 1]
  return next ? `/en/trails/${t.id}/steps/${next.id}` : `/en/trails/${t.id}/end`
})
</script>
<template>
  <template v-if="currentTrail && step && current">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><RouterLink to="/en/trails">Trails</RouterLink><span>{{ currentTrail.title }}</span><span aria-current="page">{{ current.title }}</span></nav>
    <h1 tabindex="-1">{{ current.title }}</h1><SavePlace />
    <p>Step {{ stepIndex + 1 }} of {{ currentTrail.steps.length }} · {{ currentTrail.title }}</p>
    <ConceptBody :concept="current" :scope="`trail-${step.id}`" />
    <h2>{{ stepIndex + 1 === currentTrail.steps.length ? 'Bring the distinction together' : 'Where the argument leads' }}</h2>
    <ProseBlock :block="step.transition" :scope="`${step.id}-transition`" />
    <nav class="actions" aria-label="Trail steps">
      <ReadingLink v-if="stepIndex > 0" :id="`${step.id}-previous`" :to="`/en/trails/${currentTrail.id}/steps/${currentTrail.steps[stepIndex-1].id}`">Previous: {{ concept(currentTrail.steps[stepIndex-1].conceptId)?.title }}</ReadingLink>
      <ReadingLink :id="`${step.id}-next`" :to="nextRoute">{{ stepIndex + 1 === currentTrail.steps.length ? 'Reach the trail ending' : `Next: ${concept(currentTrail.steps[stepIndex+1].conceptId)?.title}` }}</ReadingLink>
      <ReadingLink :id="`${step.id}-skip`" :to="nextRoute">Skip this step</ReadingLink>
      <ReadingLink :id="`${step.id}-concept`" :to="`/en/concepts/${current.id}`">Open full concept: {{ current.title }}</ReadingLink>
    </nav>
    <ReturnLink /><RouterLink to="/en/trails">Return to trails</RouterLink>
  </template>
  <Unavailable v-else />
</template>
