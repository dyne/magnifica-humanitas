<script setup lang="ts">
import { activeLocale, localePath, number, list, isolate } from '../locale'
import { t as msg, dispositionLabel } from '../messages'
import SavePlace from '../components/SavePlace.vue'
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { loadContext } from '../source-context'
import type { ReadingContextIndex } from '../reading-types'
import { edition, paragraphLabel } from '../reading'
import ProseBlock from '../components/ProseBlock.vue'
import ReadingLink from '../components/ReadingLink.vue'
import ReturnLink from '../components/ReturnLink.vue'
const route = useRoute()
const index = ref<ReadingContextIndex>()
const loading = ref(true)
const failed = ref(false)
let request = 0
onBeforeUnmount(() => { request++ })
async function load() {
  const token = ++request
  index.value = undefined; loading.value = true; failed.value = false
  try { const result = await loadContext(); if (token === request) index.value = result }
  catch { if (token === request) failed.value = true }
  finally { if (token === request) loading.value = false }
}
function reload() { void load() }
watch(() => [route.params.paragraphId, activeLocale.value], load, { immediate: true })
const current = computed(() => index.value?.paragraphs.find(p => p.paragraphId === route.params.paragraphId))
watch([current, () => route.fullPath], ([p]) => { document.title = msg('concept.value_magnifica_humanitas', { value1: p ? msg('source.source_context_value', { value1: p.number }) : msg('route.source_context') }) }, { immediate: true, flush: 'post' })
</script>
<template>
  <nav class="breadcrumbs" :aria-label="msg('about.breadcrumb')"><RouterLink :to="localePath('/atlas')">{{ msg('app.atlas') }}</RouterLink><span aria-current="page">{{ msg('source.source_context') }}</span></nav>
  <h1 id="page-heading" tabindex="-1">{{ loading ? msg('source.opening_source_context') : failed ? msg('source.source_context_could_not_load') : current ? msg('source.source_context_value', { value1: current.number }) : msg('note.this_link_is_unavailable') }}</h1>
  <template v-if="loading"><p role="status">{{ msg('source.loading_the_reviewed_source_context') }}</p></template>
  <template v-else-if="failed"><p role="alert">{{ msg('source.the_source_context_is_unavailable_retry_return_to_your_reading_or') }}</p><button class="dyne-button" @click="reload">{{ msg('source.retry_source_context') }}</button><ReturnLink /></template>
  <template v-else-if="current"><SavePlace />
    <p v-if="current.pages.length">{{ msg('note.leo_xiv') }} <cite>{{ msg('app.magnifica_humanitas') }}</cite>{{ msg('source.15_may_2026_edition_value_original_pdf_value_value', { value1: isolate(edition), value2: current.pages.length === 1 ? msg('source.page') : msg('source.pages'), value3: list(current.pages.map(number)) }) }}</p>
    <p v-if="!current.pages.length">{{ msg('source.html_edition', { edition: isolate(edition) }) }}</p>
    <ProseBlock :block="current.explanation" :scope="`context-${current.paragraphId}`" />
    <section v-for="q in current.quotations" :key="`${q.paragraphId}-${q.start}`">
      <h2>{{ msg('source.exact_source_quotation') }}</h2><blockquote><p>{{ q.text }}</p><cite>{{ msg('source.leo_xiv_value', { value1: paragraphLabel(q.paragraphId) }) }}</cite></blockquote>
    </section>
    <section v-if="current.footnoteIds.length"><h2>{{ msg('source.source_notes') }}</h2>
      <ul><li v-for="id in current.footnoteIds" :key="id"><ReadingLink :id="`${current.paragraphId}-note-${id}`" :to="`/${activeLocale}/notes/${id}`">{{ msg('source.source_note_value', { value1: Number(id.slice(1)) }) }}</ReadingLink></li></ul>
    </section>
    <section><h2>{{ msg('source.editorial_placement_and_exclusions') }}</h2><p class="kind">{{ msg('source.editorial_decision_value', { value1: dispositionLabel(current.disposition) }) }}</p><p>{{ current.placementExplanation }}</p>
      <p>{{ msg('source.value_context_is_a_reviewed_paraphrase_and_approved_quotation_not', { value1: current.exclusionCount ? msg('source.value_devotional_forms_are_excluded_from_this_paragraph_s_adaptat', { value1: current.exclusionCount }) : msg('source.no_prayer_or_liturgical_formula_is_excluded_from_this_paragraph') }) }}</p>
      <RouterLink :to="localePath('/about')">{{ msg('source.read_the_adaptation_method') }}</RouterLink>
    </section>
    <ReturnLink />
  </template>
  <template v-else><p>{{ msg('note.the_requested_source_item_is_not_available_in_this_reviewed_editi') }}</p><RouterLink :to="localePath('/atlas')">{{ msg('note.explore_the_atlas') }}</RouterLink><ReturnLink /></template>
</template>
