<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { concepts } from '../reading'
import ConceptBody from '../components/ConceptBody.vue'
import Unavailable from './Unavailable.vue'
const route = useRoute()
const blocks = concepts.flatMap(c => [`${c.id}-idea`, `${c.id}-distinction`, `${c.id}-connections`, ...c.reasoning.map(b => b.id)])
const valid = computed(() => route.query.at === undefined || (typeof route.query.at === 'string' && blocks.includes(route.query.at)))
</script>
<template>
  <template v-if="valid">
    <h1 tabindex="-1">Read the opening argument</h1>
    <p>Four opening concepts in source order, with their reasoning and necessary qualifications. The complete adapted sequence covering all 245 paragraphs is in preparation.</p>
    <nav aria-label="Opening reading contents"><RouterLink v-for="c in concepts" :key="c.id" :to="`/en/read?at=${c.id}-idea`">{{ c.title }}</RouterLink></nav>
    <article v-for="c in concepts" :key="c.id"><h2>{{ c.title }}</h2><ConceptBody :concept="c" :scope="`read-${c.id}`" /></article>
    <h2>End of the opening reading</h2><p>You can stop here or follow a different question.</p><RouterLink to="/en/atlas">Return to the atlas</RouterLink>
  </template>
  <template v-else><Unavailable /><p>The requested reading block is unavailable. <RouterLink to="/en/read">Start the opening reading</RouterLink>.</p></template>
</template>
