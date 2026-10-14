<script setup lang="ts">
import { activeLocale } from '../locale'
import { t as msg } from '../messages'
import type { Concept } from '../reading-types'
import { concept as findConcept, relations, relationLabel } from '../reading'
import ProseBlock from './ProseBlock.vue'
import ReadingLink from './ReadingLink.vue'
defineProps<{ concept: Concept; scope: string }>()
</script>
<template>
  <section :id="`${concept.id}-idea`" data-reading-block tabindex="-1" :aria-label="msg('conceptbody.opening_idea')">
    <ProseBlock :block="concept.definition" :scope="`${scope}-idea`" idea />
  </section>
  <section :id="`${concept.id}-distinction`" data-reading-block tabindex="-1">
    <h2>{{ msg('conceptbody.necessary_distinction') }}</h2><ProseBlock :block="concept.necessaryDistinction" :scope="`${scope}-distinction`" />
  </section>
  <section :aria-label="msg('conceptbody.reasoning')"><h2>{{ msg('conceptbody.why_the_source_argues_this') }}</h2>
    <section v-for="b in concept.reasoning" :key="b.id" :id="b.id" data-reading-block tabindex="-1"><ProseBlock :block="b" :scope="`${scope}-${b.id}`" /></section>
  </section>
  <section :id="`${concept.id}-connections`" data-reading-block tabindex="-1"><h2>{{ msg('conceptbody.follow_the_reasoning') }}</h2>
    <ul class="relationships"><li v-for="r in relations.filter(r => r.from === concept.id || r.to === concept.id)" :key="r.id">
      <ReadingLink :id="`${scope}-relation-${r.id}`" :to="`/${activeLocale}/relations/${r.id}`">{{ findConcept(r.from)?.title }} {{ relationLabel(r.type) }} {{ findConcept(r.to)?.title }}</ReadingLink>
      <p>{{ msg('conceptbody.editorial_relationshipvalue_value', { value1: r.placement === 'optional-foundations' ? msg('atlas.optional_theological_foundations') : '', value2: r.explanation.text }) }}</p>
    </li></ul>
  </section>
  <p v-if="concept.foundation"><ReadingLink :id="`${scope}-foundation`" :to="`/${activeLocale}/foundations/${concept.id}`">{{ msg('conceptbody.optional_theological_foundations_for_value', { value1: concept.title }) }}</ReadingLink></p>
</template>
