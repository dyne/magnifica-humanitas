<script setup lang="ts">
import { wasVisited } from '../local-state'
import ResumeInvitation from '../components/ResumeInvitation.vue'
import { trails, concept, trail } from '../reading'
import ProseBlock from '../components/ProseBlock.vue'
import ReadingLink from '../components/ReadingLink.vue'
</script>
<template>
  <h1 tabindex="-1">Choose a question-led trail</h1><ResumeInvitation />
  <p>Finite paths through the argument. You can skip, inspect a source, open a full concept or stop whenever you choose.</p>
  <section v-for="t in trails" :key="t.id"><h2>{{ t.question }}</h2><p>{{ t.readingEstimate.label }} · {{ t.readingEstimate.minutes }} minutes, at an assumed {{ t.readingEstimate.wordsPerMinute }} words per minute. Reading and thought may take longer; you can stop at any step.</p><p>{{ t.steps.length }} steps · {{ t.steps.map(s => concept(s.conceptId)?.title).join(' → ') }}</p>
    <ProseBlock :block="t.introduction" :scope="`${t.id}-introduction`" />
    <ProseBlock :block="t.qualification" :scope="`${t.id}-qualification`" />
    <ol><li v-for="s in t.steps" :key="s.id"><ReadingLink :id="`${t.id}-overview-${s.id}`" :to="`/en/trails/${t.id}/steps/${s.id}`">{{ concept(s.conceptId)?.title }}</ReadingLink><span v-if="wasVisited('trail', t.id, s.id)"> · Visited</span></li></ol>
    <p v-if="t.optionalConceptIds.length">Optional companion concepts: <ReadingLink v-for="id in t.optionalConceptIds" :key="id" :id="`${t.id}-optional-${id}`" :to="`/en/concepts/${id}`">{{ concept(id)?.title }}</ReadingLink></p>
    <p>Related questions: <ReadingLink v-for="id in t.relatedTrailIds" :key="id" :id="`${t.id}-related-${id}`" :to="`/en/trails/${id}/steps/${trail(id)?.steps[0].id}`">{{ trail(id)?.question }}</ReadingLink></p>
    <ReadingLink :id="`${t.id}-start`" :to="`/en/trails/${t.id}/steps/${t.steps[0].id}`">Start {{ t.title }}</ReadingLink>
  </section>
  <p>You can choose any of these six paths, return to a source or stop without finishing a trail.</p>
</template>
