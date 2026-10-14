<script setup lang="ts">
import { paragraphLabel } from '../reading'
import ReadingLink from './ReadingLink.vue'
defineProps<{ refs: string[]; scope: string }>()
</script>
<template>
  <p class="sources">Source paragraphs:
    <template v-for="(id, index) in refs" :key="id"><span v-if="index">, </span><ReadingLink :id="`${scope}-source-${id}`" :to="`/en/source/${id}`">{{ paragraphLabel(id) }}</ReadingLink></template>
  </p>
</template>
