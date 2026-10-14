<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
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
async function load(retry = false) {
  failed.value = false
  try {
    sequence.value = await loadSequence()
    if (retry) { await nextTick(); const block = document.getElementById(String(route.query.at)) ?? document.querySelector<HTMLElement>('main h1'); block?.focus(); }
  } catch { failed.value = true }
}
void load()
</script>
<template>
  <template v-if="failed"><h1 tabindex="-1">Continuous reading could not load</h1><p>The adapted prose is temporarily unavailable. You can retry or explore a concept.</p><button @click="load(true)">Retry continuous reading</button><p><RouterLink to="/en/atlas">Explore the atlas</RouterLink></p></template>
  <template v-else-if="!sequence"><h1 tabindex="-1">Read continuously</h1><p role="status">Loading the source-ordered adaptation…</p></template>
  <template v-else-if="valid">
    <h1 tabindex="-1">Read continuously</h1>
    <p>The adapted argument follows all 245 source paragraphs. Source-linked paraphrases remain distinct from editorial interpretation. Historical and theological context opens through labelled links at its source position.</p>
    <form class="actions" @submit.prevent><label for="paragraph-jump">Jump to paragraph</label><select id="paragraph-jump" :value="route.query.at ?? ''" @change="$router.push({ path: '/en/read', query: { at: ($event.target as HTMLSelectElement).value } })"><option disabled value="">Choose a paragraph</option><option v-for="b in sequence" :key="b.id" :value="b.id">§{{ Number(b.contextId.slice(1)) }} · {{ b.title }}</option></select></form>
    <article v-if="legacy"><h2>Concept reading · {{ legacy.title }}</h2><p>This existing concept link is preserved alongside the source-ordered reading.</p><ConceptBody :concept="legacy" :scope="`read-${legacy.id}`" /></article>
    <article v-for="b in sequence" :id="b.id" :key="b.id" tabindex="-1" :data-placement="b.placement" data-reading-block>
      <h2>§{{ Number(b.contextId.slice(1)) }} · {{ b.title }}</h2>
      <ProseBlock v-if="b.explanation" :block="b.explanation" :scope="b.id" />
      <p v-else>Optional historical or theological context. This source position remains available outside the main secular reading.</p>
      <p><ReadingLink :id="`${b.id}-context`" :to="`/en/source/${b.contextId}`">{{ b.placement === 'optional-context' ? 'Optional context · ' : '' }}{{ b.contextLinkLabel }}</ReadingLink></p>
      <p v-if="b.foundationContextId && b.placement === 'main'"><ReadingLink :id="`${b.id}-foundation`" :to="`/en/source/${b.foundationContextId}`">Optional attributed theological premises · §{{ Number(b.foundationContextId.slice(1)) }}</ReadingLink></p>
      <SavePlace :block-id="b.id" />
    </article>
    <h2>End of the adapted reading</h2><p>You can stop here or follow a different question.</p><RouterLink to="/en/atlas">Return to the atlas</RouterLink>
  </template>
  <template v-else><Unavailable /><p>The requested reading block is unavailable. <RouterLink to="/en/read">Start the adapted reading</RouterLink>.</p></template>
</template>
