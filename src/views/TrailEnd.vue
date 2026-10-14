<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { concept, trail } from '../reading'
import { visitedTrailSteps } from '../trail-state'
import ProseBlock from '../components/ProseBlock.vue'
import ReadingLink from '../components/ReadingLink.vue'
import Unavailable from './Unavailable.vue'
const route = useRoute()
const current = computed(() => trail(route.params.trailId))
const visited = computed(() => current.value?.steps.filter(s => visitedTrailSteps.has(`${current.value!.id}/${s.id}`)) ?? [])
watch(current, t => { document.title = `${t ? `Trail ending · ${t.title}` : 'Link unavailable'} · Magnifica Humanitas` }, { immediate: true })
</script>
<template>
  <template v-if="current">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><RouterLink to="/en/trails">Trails</RouterLink><span aria-current="page">{{ current.title }} · ending</span></nav>
    <h1 tabindex="-1">A place to stop</h1><p>{{ current.title }} · End of this {{ current.steps.length }}-step trail.</p>
    <ProseBlock :block="current.ending" :scope="`${current.id}-ending`" />
    <h2>Places opened in this tab</h2>
    <p v-if="!visited.length">No trail steps have been opened in this tab. This trail moves from Human dignity to Human rights.</p>
    <ul v-else><li v-for="s in visited" :key="s.id"><ReadingLink :id="`end-${s.id}`" :to="`/en/concepts/${s.conceptId}`">{{ concept(s.conceptId)?.title }}</ReadingLink></li></ul>
    <p>Visits are not evidence of understanding. This list lasts for this tab; saving a place is in preparation.</p>
    <p class="actions"><ReadingLink :id="`${current.id}-restart`" :to="`/en/trails/${current.id}/steps/${current.steps[0].id}`">Restart this trail</ReadingLink><RouterLink to="/en/atlas">Return to the atlas</RouterLink></p>
  </template>
  <Unavailable v-else />
</template>
