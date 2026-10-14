<script setup lang="ts">
import { localePath } from '../locale'
import { t as msg } from '../messages'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { readCaller, savePosition } from '../navigation'
const route = useRoute()
const router = useRouter()
const caller = ref(readCaller())
watch(() => route.fullPath, () => { caller.value = readCaller() }, { flush: 'post' })
function returnTo(event: MouseEvent) {
  if (!caller.value || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  event.preventDefault()
  savePosition('return-to-reading', true)
  if (history.state?.back === caller.value.route) router.back()
  else {
    const to = router.resolve(caller.value.route)
    router.push({ path: to.path, query: to.query, hash: to.hash, state: { mhRestore: { ...caller.value } } })
  }
}
</script>
<template>
  <p v-if="caller" class="return"><a id="return-to-reading" :href="router.resolve(caller.route).href" @click="returnTo">{{ msg('returnlink.return_to_value', { value1: caller.label }) }}</a></p>
  <p v-else class="return"><RouterLink :to="localePath('/atlas')">{{ msg('note.explore_the_atlas') }}</RouterLink> · <RouterLink :to="localePath('/read')">{{ msg('returnlink.open_the_continuous_reading') }}</RouterLink></p>
</template>
