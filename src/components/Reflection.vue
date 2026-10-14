<script setup lang="ts">
import { t as msg } from '../messages'
import { ref, watch, nextTick } from 'vue'
import type { Reflection } from '../reading-types'
import ProseBlock from './ProseBlock.vue'
const props = defineProps<{ reflection: Reflection }>()
const revealed = ref(false), skipped = ref(false)
watch(() => props.reflection.id, () => { revealed.value = false; skipped.value = false })
function reveal() { revealed.value = true; skipped.value = false; document.getElementById(`${props.reflection.id}-reveal`)?.focus({ preventScroll: true }) }
async function reset() { revealed.value = false; skipped.value = false; await nextTick(); document.getElementById(`${props.reflection.id}-reveal`)?.focus() }
</script>
<template><section class="reflection" :aria-labelledby="`${reflection.id}-heading`"><h2 :id="`${reflection.id}-heading`">{{ msg('reflection.optional_reflection') }}</h2><p>{{ msg('reflection.think_about_the_distinction_then_reveal_its_source_backed_explana') }}</p><ProseBlock v-if="reflection.scenario" :block="reflection.scenario" :scope="`${reflection.id}-scenario`" /><ProseBlock :block="reflection.prompt" :scope="`${reflection.id}-prompt`" /><div class="actions"><button :id="`${reflection.id}-reveal`" :aria-expanded="revealed" :aria-controls="`${reflection.id}-feedback`" @click="reveal">{{ msg('reflection.reveal_explanation') }}</button><button @click="skipped = true; revealed = false">{{ msg('reflection.skip_reflection') }}</button><button v-if="revealed || skipped" @click="reset">{{ msg('reflection.think_again') }}</button></div><p v-if="skipped" role="status">{{ msg('reflection.reflection_skipped_you_can_continue_or_return_to_it') }}</p><section v-if="revealed" :id="`${reflection.id}-feedback`" tabindex="-1"><h3>{{ msg('reflection.a_distinction_to_compare_with_your_thought') }}</h3><ProseBlock :block="reflection.feedback" :scope="`${reflection.id}-feedback`" /></section></section></template>
