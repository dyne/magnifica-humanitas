<script setup lang="ts">
import type { Prose } from '../reading-types'
import { labelKind } from '../reading'
import SourceRefs from './SourceRefs.vue'
defineProps<{ block: Prose; scope: string; idea?: boolean }>()
</script>
<template><p class="kind">{{ labelKind(block.kind) }}</p><p :class="{ idea }">{{ block.text }}</p><SourceRefs :refs="block.sourceRefs" :scope="scope" /></template>
