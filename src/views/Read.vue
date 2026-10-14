<script setup lang="ts">
import { activeLocale, localePath, number } from '../locale'
import { t as msg } from '../messages'
import { computed, ref, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { concepts } from '../reading'
import { loadSequence } from '../sequence'
import type { ReadingEntry } from '../reading-types'
import ConceptBody from '../components/ConceptBody.vue'
import ProseBlock from '../components/ProseBlock.vue'
import ReadingLink from '../components/ReadingLink.vue'
import Unavailable from './Unavailable.vue'
import SavePlace from '../components/SavePlace.vue'
const route = useRoute()
const sequence = ref<ReadingEntry[]>()
const failed = ref(false)
const legacy = computed(() => concepts.find(c => [`${c.id}-idea`, `${c.id}-distinction`, `${c.id}-connections`, ...c.reasoning.map(b => b.id)].includes(String(route.query.at))))
const valid = computed(() => route.query.at === undefined || (typeof route.query.at === 'string' && (sequence.value?.some(b => b.id === route.query.at) || legacy.value)))
let request = 0
onBeforeUnmount(() => { request++ })
async function load(retry = false) {
  const token = ++request
  sequence.value = undefined
  failed.value = false
  try {
    const result = await loadSequence()
    if (token !== request) return
    sequence.value = result
    if (retry) { await nextTick(); const block = document.getElementById(String(route.query.at)) ?? document.querySelector<HTMLElement>('main h1'); block?.focus(); }
  } catch { if (token === request) failed.value = true }
}
void load()
</script>
<template>
  <template v-if="failed"><h1 tabindex="-1">{{ msg('read.continuous_reading_could_not_load') }}</h1><p>{{ msg('read.the_adapted_prose_is_temporarily_unavailable_you_can_retry_or_exp') }}</p><button @click="load(true)">{{ msg('read.retry_continuous_reading') }}</button><p><RouterLink :to="localePath('/atlas')">{{ msg('note.explore_the_atlas') }}</RouterLink></p></template>
  <template v-else-if="!sequence"><h1 tabindex="-1">{{ msg('app.read_continuously') }}</h1><p role="status">{{ msg('read.loading_the_source_ordered_adaptation') }}</p></template>
  <template v-else-if="valid">
    <h1 tabindex="-1">{{ msg('app.read_continuously') }}</h1>
    <p>{{ msg('read.the_adapted_argument_follows_all_245_source_paragraphs_source_lin') }}</p>
    <form class="actions" @submit.prevent><label for="paragraph-jump">{{ msg('read.jump_to_paragraph') }}</label><select id="paragraph-jump" :value="route.query.at ?? ''" @change="$router.push({ path: localePath('/read'), query: { at: ($event.target as HTMLSelectElement).value } })"><option disabled value="">{{ msg('read.choose_a_paragraph') }}</option><option v-for="b in sequence" :key="b.id" :value="b.id">§{{ number(Number(b.contextId.slice(1))) }} · {{ b.title }}</option></select></form>
    <article v-if="legacy"><h2>{{ msg('read.concept_reading_value', { value1: legacy.title }) }}</h2><p>{{ msg('read.this_existing_concept_link_is_preserved_alongside_the_source_orde') }}</p><ConceptBody :concept="legacy" :scope="`read-${legacy.id}`" /></article>
    <article v-for="b in sequence" :id="b.id" :key="b.id" tabindex="-1" :data-placement="b.placement" data-reading-block>
      <h2>§{{ number(Number(b.contextId.slice(1))) }} · {{ b.title }}</h2>
      <ProseBlock v-if="b.explanation" :block="b.explanation" :scope="b.id" />
      <p v-else>{{ msg('read.optional_historical_or_theological_context_this_source_position_r') }}</p>
      <p><ReadingLink :id="`${b.id}-context`" :to="`/${activeLocale}/source/${b.contextId}`">{{ b.placement === 'optional-context' ? msg('read.optional_context') : '' }}{{ b.contextLinkLabel }}</ReadingLink></p>
      <p v-if="b.foundationContextId && b.placement === 'main'"><ReadingLink :id="`${b.id}-foundation`" :to="`/${activeLocale}/source/${b.foundationContextId}`">{{ msg('read.optional_attributed_theological_premises_value', { value1: Number(b.foundationContextId.slice(1)) }) }}</ReadingLink></p>
      <SavePlace :block-id="b.id" />
    </article>
    <h2>{{ msg('read.end_of_the_adapted_reading') }}</h2><p>{{ msg('read.you_can_stop_here_or_follow_a_different_question') }}</p><RouterLink :to="localePath('/atlas')">{{ msg('about.return_to_the_atlas') }}</RouterLink>
  </template>
  <template v-else><Unavailable /><p>{{ msg('read.the_requested_reading_block_is_unavailable') }} <RouterLink :to="localePath('/read')">{{ msg('read.start_the_adapted_reading') }}</RouterLink>.</p></template>
</template>
