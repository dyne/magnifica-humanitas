<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { savePosition } from '../navigation'
const props = defineProps<{ to: string; id: string }>()
const route = useRoute()
const router = useRouter()
function follow(event: MouseEvent) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  event.preventDefault()
  savePosition(props.id, true)
  const destination = router.resolve(props.to)
  router.push({ path: destination.path, query: destination.query, hash: destination.hash,
    state: { mhCaller: { route: route.fullPath, label: document.querySelector('main h1')?.textContent ?? 'your reading', focusId: props.id, top: window.scrollY } },
  })
}
</script>
<template><RouterLink :to="to" custom v-slot="{ href }"><a :id="id" :href="href" @click="follow"><slot /></a></RouterLink></template>
