<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
async function load() {
  const token = ++request
  loading.value = true; failed.value = false
  try { const result = await loadContext(); if (token === request) index.value = result }
  catch { if (token === request) failed.value = true }
  finally { if (token === request) loading.value = false }
}
function reload() { window.location.reload() }
watch(() => route.params.noteId, load, { immediate: true })
const current = computed(() => index.value?.notes.find(n => n.id === route.params.noteId))
const previous = computed(() => current.value && /^(Cf\. )?ibid\./i.test(current.value.text) ? index.value?.notes.find(n => n.number === current.value!.number - 1) : undefined)
watch(current, n => { document.title = `${n ? `Source note ${n.number}` : 'Source note'} · Magnifica Humanitas` }, { immediate: true })
</script>
<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb"><RouterLink to="/en/atlas">Atlas</RouterLink><span aria-current="page">Source note</span></nav>
  <h1 id="page-heading" tabindex="-1">{{ loading ? 'Opening source note' : failed ? 'Source note could not load' : current ? `Source note ${current.number}` : 'This link is unavailable' }}</h1>
  <template v-if="loading"><p role="status">Loading the reviewed bibliographic note.</p></template>
  <template v-else-if="failed"><p role="alert">The note is unavailable. Retry, return to your reading, or use the full-original link below.</p><button class="dyne-button" @click="reload">Retry source note</button><ReturnLink /></template>
  <template v-else-if="current">
    <p>Leo XIV, <cite>Magnifica Humanitas</cite>, 15 May 2026 · {{ edition }} · Original PDF {{ current.pages.length === 1 ? 'page' : 'pages' }} {{ current.pages.join(', ') }}.</p>
    <p class="kind">Exact source quotation · bibliographic note</p><blockquote><p>{{ current.text }}</p></blockquote>
    <p v-if="previous">Bibliographic context: “ibid.” refers to the preceding citation. <ReadingLink :id="`${current.id}-previous`" :to="`/en/notes/${previous.id}`">Open source note {{ previous.number }}</ReadingLink>.</p>
    <h2>Referring paragraphs in this reading</h2><ul><li v-for="id in current.paragraphIds" :key="id"><ReadingLink :id="`${current.id}-paragraph-${id}`" :to="`/en/source/${id}`">Source {{ paragraphLabel(id) }}</ReadingLink></li></ul>
    <ReturnLink />
  </template>
  <template v-else><p>The requested source item is not available in this reviewed opening edition.</p><RouterLink to="/en/atlas">Explore the atlas</RouterLink><ReturnLink /></template>
</template>
