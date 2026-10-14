<script setup lang="ts">
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
<template><div v-if="activeLocation" class="save-place"><button :aria-pressed="saved" @click="toggleSaved(blockId)">{{ saved ? 'Remove saved place' : blockId ? 'Save this paragraph' : 'Save this place' }}</button><span v-if="saved">{{ storageUnavailable ? 'Saved temporarily in this tab' : 'Saved on this device' }}</span><span v-else>Places stay on this device. Visits do not measure understanding.</span></div></template>
