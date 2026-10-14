<script setup lang="ts">
import { t as msg } from '../messages'
import { computed } from 'vue'
import { localData, activeLocation, captureLocation, savedIndex, toggleSaved, storageUnavailable } from '../local-state'
const props = defineProps<{ blockId?: string }>()
const location = computed(() => {
  if (props.blockId && activeLocation.value) return { ...activeLocation.value, blockId: props.blockId, offset: 0 }
  void localData.last
  return captureLocation()
})
const saved = computed(() => location.value ? savedIndex(location.value) >= 0 : false)
</script>
<template><div v-if="activeLocation" class="save-place"><button :aria-pressed="saved" @click="toggleSaved(blockId)">{{ saved ? msg('saveplace.remove_saved_place') : blockId ? msg('saveplace.save_this_paragraph') : msg('saveplace.save_this_place') }}</button><span v-if="saved">{{ storageUnavailable ? msg('saveplace.saved_temporarily_in_this_tab') : msg('saveplace.saved_on_this_device') }}</span><span v-else>{{ msg('saveplace.places_stay_on_this_device_visits_do_not_measure_understanding') }}</span></div></template>
