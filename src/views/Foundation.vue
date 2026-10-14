<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { concept } from '../reading'
import ProseBlock from '../components/ProseBlock.vue'
import ReturnLink from '../components/ReturnLink.vue'
import Unavailable from './Unavailable.vue'
const route = useRoute()
const current = computed(() => concept(route.params.conceptId))
watch(current, c => { document.title = `${c?.title ? `Optional foundations · ${c.title}` : 'Link unavailable'} · Magnifica Humanitas` }, { immediate: true })
</script>
<template>
  <template v-if="current">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><RouterLink to="/en/atlas">Atlas</RouterLink><RouterLink :to="`/en/concepts/${current.id}`">{{ current.title }}</RouterLink><span aria-current="page">Optional foundations</span></nav>
    <h1 tabindex="-1">Optional theological foundations · {{ current.title }}</h1>
    <p>Attributed premises of Leo XIV’s argument. These are available for depth; agreement is not required.</p>
    <ProseBlock v-if="current.foundation" :block="current.foundation" :scope="`${current.id}-foundation`" />
    <p v-else>This concept has no separate theological foundation in the published reading.</p>
    <ReturnLink /><RouterLink :to="`/en/concepts/${current.id}`">Read {{ current.title }}</RouterLink>
  </template>
  <Unavailable v-else />
</template>
