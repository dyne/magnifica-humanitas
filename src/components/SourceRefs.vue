<script setup lang="ts">
import { activeLocale } from '../locale'
import { t as msg } from '../messages'
import { paragraphLabel } from '../reading'
import ReadingLink from './ReadingLink.vue'
defineProps<{ refs: string[]; scope: string }>()
</script>
<template>
  <p class="sources">{{ msg('sourcerefs.source_paragraphs') }} <template v-for="(id, index) in refs" :key="id"><span v-if="index">, </span><ReadingLink :id="`${scope}-source-${id}`" :to="`/${activeLocale}/source/${id}`"><bdi dir="ltr">{{ paragraphLabel(id) }}</bdi></ReadingLink></template>
  </p>
</template>
