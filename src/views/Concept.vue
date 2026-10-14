<script setup lang="ts">
import { localePath } from '../locale'
import { t as msg } from '../messages'
import SavePlace from '../components/SavePlace.vue'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { concept } from '../reading'
import ConceptBody from '../components/ConceptBody.vue'
import ReturnLink from '../components/ReturnLink.vue'
import Unavailable from './Unavailable.vue'
const route = useRoute()
const current = computed(() => concept(route.params.conceptId))
watch(current, c => { document.title = msg('concept.value_magnifica_humanitas', { value1: c?.title ?? msg('route.link_unavailable') }) }, { immediate: true })
</script>
<template>
  <template v-if="current">
    <nav class="breadcrumbs" :aria-label="msg('about.breadcrumb')"><RouterLink :to="localePath('/atlas')">{{ msg('app.atlas') }}</RouterLink><span aria-current="page">{{ current.title }}</span></nav>
    <h1 tabindex="-1">{{ current.title }}</h1><SavePlace />
    <ConceptBody :concept="current" :scope="current.id" />
    <ReturnLink />
    <p><RouterLink :to="localePath('/atlas')">{{ msg('about.return_to_the_atlas') }}</RouterLink> · <RouterLink :to="localePath('/trails')">{{ msg('concept.choose_a_trail') }}</RouterLink></p>
  </template>
  <Unavailable v-else />
</template>
