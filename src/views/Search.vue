<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { concepts, relations, trails } from '../reading'
import { loadSequence } from '../sequence'
import type { ReadingEntry } from '../reading-types'
import { searchPublished, normalizeQuery } from '../../scripts/search.mjs'
import ReadingLink from '../components/ReadingLink.vue'
import SourceRefs from '../components/SourceRefs.vue'
const route = useRoute(), router = useRouter()
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const input = ref<HTMLInputElement>()
const sequence = ref<ReadingEntry[]>()
const failed = ref(false)
watch(() => route.query.q, q => { query.value = typeof q === 'string' ? q : '' })
const results = computed(() => searchPublished({ concepts, relations, trails }, sequence.value ?? [], query.value))
const hasQuery = computed(() => !!normalizeQuery(query.value))
async function load(retry = false) {
  failed.value = false
  try { sequence.value = await loadSequence(); if (retry) { await nextTick(); input.value?.focus() } }
  catch { failed.value = true }
}
void load()
function edit() { router.replace({ path: '/en/search', query: query.value ? { q: query.value } : {} }) }
function submit() { query.value = query.value.trim().replace(/\s+/g, ' '); edit() }
function clear() { query.value = ''; edit(); input.value?.focus() }
</script>
<template>
  <h1 tabindex="-1">Search this reading</h1>
  <p>Find concepts and glossary definitions, relationships, trails and adapted paragraphs. Search uses the authored English reading, including labelled optional context titles, rather than the unmodified original.</p>
  <form class="search-form" role="search" @submit.prevent="submit"><label for="search-query">Term or paragraph number</label><div class="actions"><input id="search-query" ref="input" v-model="query" type="search" maxlength="200" @input="edit"><button type="submit">Search</button><button type="button" @click="clear">Clear search</button></div></form>
  <p v-if="!hasQuery">Try “dignity”, “subsidiarity”, or a source paragraph such as “§52”. <RouterLink to="/en/atlas">Browse all concepts</RouterLink>.</p>
  <p v-if="failed" role="status">Adapted paragraph search could not load. Concept, glossary, relationship and trail search still work. <button @click="load(true)">Retry paragraph search</button></p>
  <p v-else-if="!sequence" role="status">Loading adapted paragraph search…</p>
  <template v-if="hasQuery">
    <p role="status">{{ results.length ? `${results.length} results` : sequence ? 'No results for this query.' : 'No matches in the available concepts and trails yet.' }}</p>
    <p v-if="!results.length">Try fewer words or a paragraph from 1 to 245. You can edit the query, clear it, or <RouterLink to="/en/atlas">explore the atlas</RouterLink>.</p>
    <ol class="search-results"><li v-for="r in results" :key="r.id"><p class="kind">{{ r.type }}</p><ReadingLink :id="`search-${r.id}`" :to="r.to">{{ r.title }}</ReadingLink><p>Source-linked editorial preview · {{ r.preview }}</p><SourceRefs :refs="r.sourceRefs" :scope="`search-${r.id}`" /></li></ol>
  </template>
</template>
