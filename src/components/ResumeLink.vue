<script setup lang="ts">
import { useRouter } from 'vue-router'
import { available, describeLocation, locationRoute } from '../local-state'
import type { ReaderLocation } from '../local-state'
const props = defineProps<{ location: ReaderLocation; id: string }>()
const router = useRouter()
function resume(event: MouseEvent) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  event.preventDefault()
  if (!available(props.location)) return
  const destination = router.resolve(locationRoute(props.location))
  router.push({ path: destination.path, query: destination.query, state: { mhResume: { ...props.location } } })
}
</script>
<template><a v-if="available(location)" :id="id" :href="router.resolve(locationRoute(location)).href" @click="resume"><bdi><slot>{{ describeLocation(location) }}</slot></bdi></a><span v-else><bdi>{{ describeLocation(location) }}</bdi></span></template>
