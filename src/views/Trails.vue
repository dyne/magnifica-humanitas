<script setup lang="ts">
import { trails, concept } from '../reading'
import ProseBlock from '../components/ProseBlock.vue'
import ReadingLink from '../components/ReadingLink.vue'
</script>
<template>
  <h1 tabindex="-1">Choose a question-led trail</h1>
  <p>Finite paths through the argument. You can skip, inspect a source, open a full concept or stop whenever you choose.</p>
  <section v-for="t in trails" :key="t.id"><h2>{{ t.title }}</h2><p>{{ t.steps.length }} steps · {{ t.steps.map(s => concept(s.conceptId)?.title).join(' → ') }}</p>
    <ProseBlock :block="t.introduction" :scope="`${t.id}-introduction`" />
    <ol><li v-for="s in t.steps" :key="s.id"><ReadingLink :id="`${t.id}-overview-${s.id}`" :to="`/en/trails/${t.id}/steps/${s.id}`">{{ concept(s.conceptId)?.title }}</ReadingLink></li></ol>
    <ReadingLink :id="`${t.id}-start`" :to="`/en/trails/${t.id}/steps/${t.steps[0].id}`">Start {{ t.title }}</ReadingLink>
  </section>
  <p>You can choose any of these six paths, return to a source or stop without finishing a trail.</p>
</template>
