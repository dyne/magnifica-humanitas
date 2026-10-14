<script setup lang="ts">
import SavePlace from '../components/SavePlace.vue'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { concept } from '../reading'
import ConceptBody from '../components/ConceptBody.vue'
import ReturnLink from '../components/ReturnLink.vue'
import Unavailable from './Unavailable.vue'
const route = useRoute()
const current = computed(() => concept(route.params.conceptId))
watch(current, c => { document.title = `${c?.title ?? 'Link unavailable'} · Magnifica Humanitas` }, { immediate: true })
</script>
<template>
  <template v-if="current">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><RouterLink to="/en/atlas">Atlas</RouterLink><span aria-current="page">{{ current.title }}</span></nav>
    <h1 tabindex="-1">{{ current.title }}</h1><SavePlace />
    <ConceptBody :concept="current" :scope="current.id" />
    <ReturnLink />
    <p><RouterLink to="/en/atlas">Return to the atlas</RouterLink> · <RouterLink to="/en/trails">Choose a trail</RouterLink></p>
  </template>
  <Unavailable v-else />
</template>
