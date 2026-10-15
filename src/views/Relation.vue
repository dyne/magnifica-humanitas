<script setup lang="ts">
import { activeLocale, localePath } from '../locale'
import { t as msg } from '../messages'
import SavePlace from '../components/SavePlace.vue'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { concept, relation, relationLabel } from '../reading'
import ProseBlock from '../components/ProseBlock.vue'
import ReadingLink from '../components/ReadingLink.vue'
import ReturnLink from '../components/ReturnLink.vue'
import Unavailable from './Unavailable.vue'
const route = useRoute()
const current = computed(() => relation(route.params.relationId))
watch([current, () => route.fullPath], ([r]) => { document.title = msg('concept.value_magnifica_humanitas', { value1: r ? `${concept(r.from)?.title} ${relationLabel(r.type)} ${concept(r.to)?.title}` : msg('route.link_unavailable') }) }, { immediate: true, flush: 'post' })
</script>
<template>
  <template v-if="current">
    <nav class="breadcrumbs" :aria-label="msg('about.breadcrumb')"><RouterLink :to="localePath('/atlas')">{{ msg('app.atlas') }}</RouterLink><span aria-current="page">{{ msg('relation.relationship') }}</span></nav>
    <h1 tabindex="-1">{{ concept(current.from)?.title }} {{ relationLabel(current.type) }} {{ concept(current.to)?.title }}</h1><SavePlace />
    <p>{{ msg('relation.this_direction_is_an_editorial_reading_of_the_source_s_argument') }}</p>
    <p v-if="current.placement === 'optional-foundations'">{{ msg('relation.optional_theological_foundations_attributed_premises_of_the_sourc') }}</p>
    <ProseBlock :block="current.explanation" :scope="current.id" />
    <p class="actions"><ReadingLink :id="`${current.id}-from`" :to="`/${activeLocale}/concepts/${current.from}`">{{ msg('relation.open_value', { value1: concept(current.from)?.title }) }}</ReadingLink><ReadingLink :id="`${current.id}-to`" :to="`/${activeLocale}/concepts/${current.to}`">{{ msg('relation.open_value', { value1: concept(current.to)?.title }) }}</ReadingLink></p>
    <ReturnLink />
  </template>
  <Unavailable v-else />
</template>
