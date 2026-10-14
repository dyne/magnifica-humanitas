<script setup lang="ts">
import type { Concept } from '../reading-types'
import { concept as findConcept, relations, relationLabel } from '../reading'
import ProseBlock from './ProseBlock.vue'
import ReadingLink from './ReadingLink.vue'
defineProps<{ concept: Concept; scope: string }>()
</script>
<template>
  <section :id="`${concept.id}-idea`" data-reading-block tabindex="-1" aria-label="Opening idea">
    <ProseBlock :block="concept.definition" :scope="`${scope}-idea`" idea />
  </section>
  <section :id="`${concept.id}-distinction`" data-reading-block tabindex="-1">
    <h2>Necessary distinction</h2><ProseBlock :block="concept.necessaryDistinction" :scope="`${scope}-distinction`" />
  </section>
  <section aria-label="Reasoning"><h2>Why the source argues this</h2>
    <section v-for="b in concept.reasoning" :key="b.id" :id="b.id" data-reading-block tabindex="-1"><ProseBlock :block="b" :scope="`${scope}-${b.id}`" /></section>
  </section>
  <section :id="`${concept.id}-connections`" data-reading-block tabindex="-1"><h2>Follow the reasoning</h2>
    <ul class="relationships"><li v-for="r in relations.filter(r => r.from === concept.id || r.to === concept.id)" :key="r.id">
      <ReadingLink :id="`${scope}-relation-${r.id}`" :to="`/en/relations/${r.id}`">{{ findConcept(r.from)?.title }} {{ relationLabel(r.type) }} {{ findConcept(r.to)?.title }}</ReadingLink>
      <p>Editorial relationship{{ r.placement === 'optional-foundations' ? ' · Optional theological foundations' : '' }} · {{ r.explanation.text }}</p>
    </li></ul>
  </section>
  <p v-if="concept.foundation"><ReadingLink :id="`${scope}-foundation`" :to="`/en/foundations/${concept.id}`">Optional theological foundations for {{ concept.title }}</ReadingLink></p>
</template>
