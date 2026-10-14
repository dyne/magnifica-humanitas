<script setup lang="ts">
import { activeLocale } from '../locale'
import { t as msg } from '../messages'
import { wasVisited } from '../local-state'
import ResumeInvitation from '../components/ResumeInvitation.vue'
import { trails, concept, trail } from '../reading'
import ProseBlock from '../components/ProseBlock.vue'
import ReadingLink from '../components/ReadingLink.vue'
</script>
<template>
  <h1 tabindex="-1">{{ msg('trails.choose_a_question_led_trail') }}</h1><ResumeInvitation />
  <p>{{ msg('trails.finite_paths_through_the_argument_you_can_skip_inspect_a_source_o') }}</p>
  <section v-for="t in trails" :key="t.id"><h2>{{ t.question }}</h2><p>{{ msg('trails.value_value_minutes_at_an_assumed_value_words_per_minute_reading_', { value1: t.readingEstimate.label, value2: t.readingEstimate.minutes, value3: t.readingEstimate.wordsPerMinute }) }}</p><p>{{ msg('trails.value_steps_value', { value1: t.steps.length, value2: t.steps.map(s => concept(s.conceptId)?.title).join(' → ') }) }}</p>
    <ProseBlock :block="t.introduction" :scope="`${t.id}-introduction`" />
    <ProseBlock :block="t.qualification" :scope="`${t.id}-qualification`" />
    <ol><li v-for="s in t.steps" :key="s.id"><ReadingLink :id="`${t.id}-overview-${s.id}`" :to="`/${activeLocale}/trails/${t.id}/steps/${s.id}`">{{ concept(s.conceptId)?.title }}</ReadingLink><span v-if="wasVisited('trail', t.id, s.id)"> {{ msg('atlas.visited') }}</span></li></ol>
    <p v-if="t.optionalConceptIds.length">{{ msg('trailend.optional_companion_concepts') }} <ReadingLink v-for="id in t.optionalConceptIds" :key="id" :id="`${t.id}-optional-${id}`" :to="`/${activeLocale}/concepts/${id}`">{{ concept(id)?.title }}</ReadingLink></p>
    <p>{{ msg('trailend.related_questions') }} <ReadingLink v-for="id in t.relatedTrailIds" :key="id" :id="`${t.id}-related-${id}`" :to="`/${activeLocale}/trails/${id}/steps/${trail(id)?.steps[0].id}`">{{ trail(id)?.question }}</ReadingLink></p>
    <ReadingLink :id="`${t.id}-start`" :to="`/${activeLocale}/trails/${t.id}/steps/${t.steps[0].id}`">{{ msg('trails.start_value', { value1: t.title }) }}</ReadingLink>
  </section>
  <p>{{ msg('trails.you_can_choose_any_of_these_six_paths_return_to_a_source_or_stop_') }}</p>
</template>
