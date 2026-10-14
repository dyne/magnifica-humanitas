<script setup lang="ts">
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
watch(current, t => { document.title = `${t ? `Trail ending · ${t.title}` : 'Link unavailable'} · Magnifica Humanitas` }, { immediate: true })
</script>
<template>
  <template v-if="current">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><RouterLink to="/en/trails">Trails</RouterLink><span aria-current="page">{{ current.title }} · ending</span></nav>
    <h1 tabindex="-1">A place to stop</h1><SavePlace /><p>{{ current.title }} · End of this {{ current.steps.length }}-step trail.</p>
    <ProseBlock :block="current.ending" :scope="`${current.id}-ending`" />
    <Reflection :key="current.reflection.id" :reflection="current.reflection" />
    <h2>Places opened</h2>
    <p v-if="!visited.length">No trail steps are recorded as opened on this device or in this tab. You can restart this trail or explore its source-linked concepts.</p>
    <ul v-else><li v-for="s in visited" :key="s.id"><ReadingLink :id="`end-${s.id}`" :to="`/en/concepts/${s.conceptId}`">{{ concept(s.conceptId)?.title }}</ReadingLink></li></ul>
    <p>Visits are not evidence of understanding. Saved places and visits record navigation only; you can leave or return whenever you choose.</p>
    <p v-if="current.optionalConceptIds.length">Optional companion concepts: <ReadingLink v-for="id in current.optionalConceptIds" :key="id" :id="`${current.id}-end-optional-${id}`" :to="`/en/concepts/${id}`">{{ concept(id)?.title }}</ReadingLink></p>
    <p>Related questions: <ReadingLink v-for="id in current.relatedTrailIds" :key="id" :id="`${current.id}-end-related-${id}`" :to="`/en/trails/${id}/steps/${trail(id)?.steps[0].id}`">{{ trail(id)?.question }}</ReadingLink></p>
    <p class="actions"><RouterLink to="/en/saved">Saved places and recent path</RouterLink><ReadingLink :id="`${current.id}-restart`" :to="`/en/trails/${current.id}/steps/${current.steps[0].id}`">Restart this trail</ReadingLink><RouterLink to="/en/atlas">Return to the atlas</RouterLink></p>
  </template>
  <Unavailable v-else />
</template>
