<script setup lang="ts">
import { activeLocale, localePath, number, list, isolate } from '../locale'
import { t as msg } from '../messages'
import SavePlace from '../components/SavePlace.vue'
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import type { ReadingContextIndex } from '../reading-types'
import { loadContext } from '../source-context'
import { edition, paragraphLabel } from '../reading'
import ReadingLink from '../components/ReadingLink.vue'
import ReturnLink from '../components/ReturnLink.vue'
const route = useRoute()
const index = ref<ReadingContextIndex>()
const failed = ref(false)
const loading = ref(true)
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
watch(() => [route.params.noteId, activeLocale.value], load, { immediate: true })
const current = computed(() => index.value?.notes.find(n => n.id === route.params.noteId))
const previous = computed(() => current.value?.previousNoteId ? index.value?.notes.find(n => n.id === current.value!.previousNoteId) : activeLocale.value === 'en' && current.value && /^(Cf\. )?ibid\./i.test(current.value.text) ? index.value?.notes.find(n => n.number === current.value!.number - 1) : undefined)
watch(current, n => { document.title = msg('concept.value_magnifica_humanitas', { value1: n ? msg('source.source_note_value', { value1: n.number }) : msg('route.source_note') }) }, { immediate: true })
</script>
<template>
  <nav class="breadcrumbs" :aria-label="msg('about.breadcrumb')"><RouterLink :to="localePath('/atlas')">{{ msg('app.atlas') }}</RouterLink><span aria-current="page">{{ msg('note.source_note') }}</span></nav>
  <h1 id="page-heading" tabindex="-1">{{ loading ? msg('note.opening_source_note') : failed ? msg('note.source_note_could_not_load') : current ? msg('source.source_note_value', { value1: current.number }) : msg('note.this_link_is_unavailable') }}</h1>
  <template v-if="loading"><p role="status">{{ msg('note.loading_the_reviewed_source_note') }}</p></template>
  <template v-else-if="failed"><p role="alert">{{ msg('note.the_note_is_unavailable_retry_return_to_your_reading_or_use_the_f') }}</p><button class="dyne-button" @click="reload">{{ msg('note.retry_source_note') }}</button><ReturnLink /></template>
  <template v-else-if="current"><SavePlace />
    <p v-if="current.pages.length">{{ msg('note.leo_xiv') }} <cite>{{ msg('app.magnifica_humanitas') }}</cite>{{ msg('note.15_may_2026_value_original_pdf_value_value', { value1: isolate(edition), value2: current.pages.length === 1 ? msg('source.page') : msg('source.pages'), value3: list(current.pages.map(number)) }) }}</p>
    <p v-if="!current.pages.length">{{ msg('source.html_edition', { edition: isolate(edition) }) }}</p>
    <p class="kind">{{ msg('note.exact_source_quotation_value', { value1: current.classification === 'source-argument-and-citation' ? msg('note.argument_and_citation') : msg('note.bibliographic_note') }) }}</p><blockquote><p>{{ current.text }}</p></blockquote>
    <p v-if="previous">{{ msg('note.bibliographic_context_ibid_refers_to_the_preceding_citation') }} <ReadingLink :id="`${current.id}-previous`" :to="`/${activeLocale}/notes/${previous.id}`">{{ msg('note.open_source_note_value', { value1: previous.number }) }}</ReadingLink>.</p>
    <h2>{{ msg('note.referring_paragraphs_in_this_reading') }}</h2><ul><li v-for="id in current.paragraphIds" :key="id"><ReadingLink :id="`${current.id}-paragraph-${id}`" :to="`/${activeLocale}/source/${id}`">{{ msg('note.source_value', { value1: paragraphLabel(id) }) }}</ReadingLink></li></ul>
    <ReturnLink />
  </template>
  <template v-else><p>{{ msg('note.the_requested_source_item_is_not_available_in_this_reviewed_editi') }}</p><RouterLink :to="localePath('/atlas')">{{ msg('note.explore_the_atlas') }}</RouterLink><ReturnLink /></template>
</template>
