<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { localData, storageUnavailable, undoSaved, removeSaved, undoRemoval, clearLocalData, describeLocation, locationKey } from '../local-state'
import ResumeLink from '../components/ResumeLink.vue'
const confirming = ref(false)
async function remove(index: number) { removeSaved(index); await nextTick(); document.getElementById('undo-removal')?.focus() }
async function undo() { undoRemoval(); await nextTick(); document.querySelector<HTMLElement>('.saved-places a, .saved-places button')?.focus() }
async function clear() { clearLocalData(); confirming.value = false; await nextTick(); document.getElementById('clear-local-data')?.focus() }
async function cancel() { confirming.value = false; await nextTick(); document.getElementById('clear-local-data')?.focus() }
async function confirmClear() { confirming.value = true; await nextTick(); document.getElementById('confirm-clear-data')?.focus() }
</script>
<template>
  <h1 tabindex="-1">Saved places and recent path</h1>
  <p>Only places you opened or chose to save are recorded here. Visits do not measure understanding. No search queries, reflection answers or beliefs are stored.</p>
  <p>{{ storageUnavailable ? 'These places are temporary in this tab; device storage is unavailable.' : 'Reading data stays on this device.' }}</p>
  <section><h2>Return to your last place</h2><p v-if="localData.last"><ResumeLink id="resume-last" :location="localData.last">Resume {{ describeLocation(localData.last) }}</ResumeLink></p><p v-else>No recent reading position yet. <RouterLink to="/en/read">Start the continuous reading</RouterLink>.</p></section>
  <section><h2>Saved places</h2><p v-if="!localData.saved.length">No saved places yet. Choose a concept or save a paragraph while reading.</p><ul v-else class="saved-places"><li v-for="(location, index) in localData.saved" :key="locationKey(location)"><ResumeLink :id="`saved-${index}`" :location="location" /><button :aria-label="`Remove ${describeLocation(location)}`" @click="remove(index)">Remove</button></li></ul><button v-if="undoSaved" id="undo-removal" @click="undo">Undo removal</button></section>
  <section><h2>Recent path</h2><p>At most ten recent reading destinations, with their last position.</p><p v-if="!localData.recent.length">No recent places yet.</p><ol v-else><li v-for="(location, index) in localData.recent" :key="locationKey(location)"><ResumeLink :id="`recent-${index}`" :location="location" /> · Visited</li></ol></section>
  <section><h2>Clear local reading data</h2><p>This removes saved places, recent position, visited labels and appearance preference, including temporary data in this tab.</p><button v-if="!confirming" id="clear-local-data" @click="confirmClear">Clear local data</button><div v-else class="actions"><p>Clear all reading data on this device?</p><button id="confirm-clear-data" @click="clear">Confirm clear all local data</button><button @click="cancel">Cancel clearing</button></div></section>
  <p class="actions"><RouterLink to="/en/atlas">Explore the atlas</RouterLink><RouterLink to="/en/read">Read continuously</RouterLink></p>
</template>
