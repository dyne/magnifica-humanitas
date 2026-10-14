<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { Reflection } from '../reading-types'
import ProseBlock from './ProseBlock.vue'
const props = defineProps<{ reflection: Reflection }>()
const revealed = ref(false), skipped = ref(false)
watch(() => props.reflection.id, () => { revealed.value = false; skipped.value = false })
function reveal() { revealed.value = true; skipped.value = false; document.getElementById(`${props.reflection.id}-reveal`)?.focus({ preventScroll: true }) }
async function reset() { revealed.value = false; skipped.value = false; await nextTick(); document.getElementById(`${props.reflection.id}-reveal`)?.focus() }
</script>
<template><section class="reflection" :aria-labelledby="`${reflection.id}-heading`"><h2 :id="`${reflection.id}-heading`">Optional reflection</h2><p>Think about the distinction, then reveal its source-backed explanation. You may understand and disagree. Nothing is scored or stored.</p><ProseBlock v-if="reflection.scenario" :block="reflection.scenario" :scope="`${reflection.id}-scenario`" /><ProseBlock :block="reflection.prompt" :scope="`${reflection.id}-prompt`" /><div class="actions"><button :id="`${reflection.id}-reveal`" :aria-expanded="revealed" :aria-controls="`${reflection.id}-feedback`" @click="reveal">Reveal explanation</button><button @click="skipped = true; revealed = false">Skip reflection</button><button v-if="revealed || skipped" @click="reset">Think again</button></div><p v-if="skipped" role="status">Reflection skipped. You can continue or return to it.</p><section v-if="revealed" :id="`${reflection.id}-feedback`" tabindex="-1"><h3>A distinction to compare with your thought</h3><ProseBlock :block="reflection.feedback" :scope="`${reflection.id}-feedback`" /></section></section></template>
