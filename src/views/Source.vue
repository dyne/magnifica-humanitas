<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
async function load() {
  const token = ++request
  loading.value = true; failed.value = false
  try { const result = await loadContext(); if (token === request) index.value = result }
  catch { if (token === request) failed.value = true }
  finally { if (token === request) loading.value = false }
}
function reload() { window.location.reload() }
watch(() => route.params.paragraphId, load, { immediate: true })
const current = computed(() => index.value?.paragraphs.find(p => p.paragraphId === route.params.paragraphId))
watch(current, p => { document.title = `${p ? `Source context · §${p.number}` : 'Source context'} · Magnifica Humanitas` }, { immediate: true })
</script>
<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb"><RouterLink to="/en/atlas">Atlas</RouterLink><span aria-current="page">Source context</span></nav>
  <h1 id="page-heading" tabindex="-1">{{ loading ? 'Opening source context' : failed ? 'Source context could not load' : current ? `Source context · §${current.number}` : 'This link is unavailable' }}</h1>
  <template v-if="loading"><p role="status">Loading the reviewed source context.</p></template>
  <template v-else-if="failed"><p role="alert">The source context is unavailable. Retry, return to your reading, or use the full-original link below.</p><button class="dyne-button" @click="reload">Retry source context</button><ReturnLink /></template>
  <template v-else-if="current">
    <p>Leo XIV, <cite>Magnifica Humanitas</cite>, 15 May 2026. Edition {{ edition }} · Original PDF {{ current.pages.length === 1 ? 'page' : 'pages' }} {{ current.pages.join(', ') }}.</p>
    <ProseBlock :block="current.explanation" :scope="`context-${current.paragraphId}`" />
    <section v-for="q in current.quotations" :key="`${q.paragraphId}-${q.start}`">
      <h2>Exact source quotation</h2><blockquote><p>{{ q.text }}</p><cite>Leo XIV · {{ paragraphLabel(q.paragraphId) }}</cite></blockquote>
    </section>
    <section v-if="current.footnoteIds.length"><h2>Source notes</h2>
      <ul><li v-for="id in current.footnoteIds" :key="id"><ReadingLink :id="`${current.paragraphId}-note-${id}`" :to="`/en/notes/${id}`">Source note {{ Number(id.slice(1)) }}</ReadingLink></li></ul>
    </section>
    <section><h2>Editorial placement and exclusions</h2><p class="kind">Editorial decision · {{ current.disposition }}</p><p>{{ current.placementExplanation }}</p>
      <p>{{ current.exclusionCount ? `${current.exclusionCount} devotional forms are excluded from this paragraph’s adaptation.` : 'No prayer or liturgical formula is excluded from this paragraph.' }} Context is a reviewed paraphrase and approved quotation, not the raw original.</p>
      <RouterLink to="/en/about">Read the adaptation method</RouterLink>
    </section>
    <ReturnLink />
  </template>
  <template v-else><p>The requested source item is not available in this reviewed opening edition.</p><RouterLink to="/en/atlas">Explore the atlas</RouterLink><ReturnLink /></template>
</template>
