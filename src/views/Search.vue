<script setup lang="ts">
import { activeLocale, localePath } from '../locale'
import { t as msg, messages } from '../messages'
import { computed, ref, onBeforeUnmount, watch, nextTick } from 'vue'
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
const results = computed(() => searchPublished({ concepts, relations, trails }, sequence.value ?? [], query.value, { locale: activeLocale.value, messages: messages.value }))
const hasQuery = computed(() => !!normalizeQuery(query.value, activeLocale.value))
let request = 0
onBeforeUnmount(() => { request++ })
async function load(retry = false) {
  const token = ++request
  sequence.value = undefined
  failed.value = false
  try { const result = await loadSequence()
    if (token !== request) return
    sequence.value = result; if (retry) { await nextTick(); input.value?.focus() } }
  catch { if (token === request) failed.value = true }
}
void load()
function edit() { router.replace({ path: localePath('/search'), query: query.value ? { q: query.value } : {} }) }
function submit() { query.value = query.value.trim().replace(/\s+/g, ' '); edit() }
function clear() { query.value = ''; edit(); input.value?.focus() }
</script>
<template>
  <h1 tabindex="-1">{{ msg('atlas.search_this_reading') }}</h1>
  <p>{{ msg('search.find_concepts_and_glossary_definitions_relationships_trails_and_a') }}</p>
  <form class="search-form" role="search" @submit.prevent="submit"><label for="search-query">{{ msg('search.term_or_paragraph_number') }}</label><div class="actions"><input id="search-query" ref="input" v-model="query" type="search" maxlength="200" @input="edit"><button type="submit">{{ msg('app.search') }}</button><button type="button" @click="clear">{{ msg('search.clear_search') }}</button></div></form>
  <p v-if="!hasQuery">{{ msg('search.try_dignity_subsidiarity_or_a_source_paragraph_such_as_52') }} <RouterLink :to="localePath('/atlas')">{{ msg('search.browse_all_concepts') }}</RouterLink>.</p>
  <p v-if="failed" role="status">{{ msg('search.adapted_paragraph_search_could_not_load_concept_glossary_relation') }} <button @click="load(true)">{{ msg('search.retry_paragraph_search') }}</button></p>
  <p v-else-if="!sequence" role="status">{{ msg('search.loading_adapted_paragraph_search') }}</p>
  <template v-if="hasQuery">
    <p role="status">{{ results.length ? msg('search.value_results', { value1: results.length }) : sequence ? msg('search.no_results_for_this_query') : msg('search.no_matches_in_the_available_concepts_and_trails_yet') }}</p>
    <p v-if="!results.length">{{ msg('search.try_fewer_words_or_a_paragraph_from_1_to_245_you_can_edit_the_que') }} <RouterLink :to="localePath('/atlas')">{{ msg('search.explore_the_atlas') }}</RouterLink>.</p>
    <ol class="search-results"><li v-for="r in results" :key="r.id"><p class="kind">{{ r.type }}</p><ReadingLink :id="`search-${r.id}`" :to="r.to">{{ r.title }}</ReadingLink><p>{{ msg('search.source_linked_editorial_preview_value', { value1: r.preview }) }}</p><SourceRefs :refs="r.sourceRefs" :scope="`search-${r.id}`" /></li></ol>
  </template>
</template>
