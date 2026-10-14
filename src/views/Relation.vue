<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { concept, relation } from '../reading'
import ProseBlock from '../components/ProseBlock.vue'
import ReadingLink from '../components/ReadingLink.vue'
import ReturnLink from '../components/ReturnLink.vue'
import Unavailable from './Unavailable.vue'
const route = useRoute()
const current = computed(() => relation(route.params.relationId))
watch(current, r => { document.title = `${r ? `${concept(r.from)?.title} ${r.type} ${concept(r.to)?.title}` : 'Link unavailable'} · Magnifica Humanitas` }, { immediate: true })
</script>
<template>
  <template v-if="current">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><RouterLink to="/en/atlas">Atlas</RouterLink><span aria-current="page">Relationship</span></nav>
    <h1 tabindex="-1">{{ concept(current.from)?.title }} {{ current.type }} {{ concept(current.to)?.title }}</h1>
    <p>This direction is an editorial reading of the source’s argument.</p>
    <ProseBlock :block="current.explanation" :scope="current.id" />
    <p class="actions"><ReadingLink :id="`${current.id}-from`" :to="`/en/concepts/${current.from}`">Open {{ concept(current.from)?.title }}</ReadingLink><ReadingLink :id="`${current.id}-to`" :to="`/en/concepts/${current.to}`">Open {{ concept(current.to)?.title }}</ReadingLink></p>
    <ReturnLink />
  </template>
  <Unavailable v-else />
</template>
