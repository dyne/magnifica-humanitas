<script setup lang="ts">
import { localePath } from '../locale'
import { t as msg } from '../messages'
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
  <h1 tabindex="-1">{{ msg('saved.saved_places_and_recent_path') }}</h1>
  <p>{{ msg('saved.only_places_you_opened_or_chose_to_save_are_recorded_here_visits_') }}</p>
  <p>{{ storageUnavailable ? msg('saved.these_places_are_temporary_in_this_tab_device_storage_is_unavaila') : msg('saved.reading_data_stays_on_this_device') }}</p>
  <section><h2>{{ msg('saved.return_to_your_last_place') }}</h2><p v-if="localData.last"><ResumeLink id="resume-last" :location="localData.last">{{ msg('saved.resume_value', { value1: describeLocation(localData.last) }) }}</ResumeLink></p><p v-else>{{ msg('saved.no_recent_reading_position_yet') }} <RouterLink :to="localePath('/read')">{{ msg('saved.start_the_continuous_reading') }}</RouterLink>.</p></section>
  <section><h2>{{ msg('saved.saved_places') }}</h2><p v-if="!localData.saved.length">{{ msg('saved.no_saved_places_yet_choose_a_concept_or_save_a_paragraph_while_re') }}</p><ul v-else class="saved-places"><li v-for="(location, index) in localData.saved" :key="locationKey(location)"><ResumeLink :id="`saved-${index}`" :location="location" /><button :aria-label="msg('saved.remove_value', { value1: describeLocation(location) })" @click="remove(index)">{{ msg('saved.remove') }}</button></li></ul><button v-if="undoSaved" id="undo-removal" @click="undo">{{ msg('app.undo_removal') }}</button></section>
  <section><h2>{{ msg('saved.recent_path') }}</h2><p>{{ msg('saved.at_most_ten_recent_reading_destinations_with_their_last_position') }}</p><p v-if="!localData.recent.length">{{ msg('saved.no_recent_places_yet') }}</p><ol v-else><li v-for="(location, index) in localData.recent" :key="locationKey(location)"><ResumeLink :id="`recent-${index}`" :location="location" /> {{ msg('atlas.visited') }}</li></ol></section>
  <section><h2>{{ msg('saved.clear_local_reading_data') }}</h2><p>{{ msg('saved.this_removes_saved_places_recent_position_visited_labels_and_appe') }}</p><button v-if="!confirming" id="clear-local-data" @click="confirmClear">{{ msg('saved.clear_local_data') }}</button><div v-else class="actions"><p>{{ msg('saved.clear_all_reading_data_on_this_device') }}</p><button id="confirm-clear-data" @click="clear">{{ msg('saved.confirm_clear_all_local_data') }}</button><button @click="cancel">{{ msg('saved.cancel_clearing') }}</button></div></section>
  <p class="actions"><RouterLink :to="localePath('/atlas')">{{ msg('note.explore_the_atlas') }}</RouterLink><RouterLink :to="localePath('/read')">{{ msg('app.read_continuously') }}</RouterLink></p>
</template>
