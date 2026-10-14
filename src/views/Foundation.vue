<script setup lang="ts">
import { activeLocale, localePath } from '../locale'
import { t as msg } from '../messages'
import SavePlace from '../components/SavePlace.vue'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { concept } from '../reading'
import ProseBlock from '../components/ProseBlock.vue'
import ReturnLink from '../components/ReturnLink.vue'
import Unavailable from './Unavailable.vue'
const route = useRoute()
const current = computed(() => concept(route.params.conceptId))
watch(current, c => { document.title = msg('concept.value_magnifica_humanitas', { value1: c?.title ? msg('foundation.optional_foundations_value', { value1: c.title }) : msg('route.link_unavailable') }) }, { immediate: true })
</script>
<template>
  <template v-if="current">
    <nav class="breadcrumbs" :aria-label="msg('about.breadcrumb')"><RouterLink :to="localePath('/atlas')">{{ msg('app.atlas') }}</RouterLink><RouterLink :to="`/${activeLocale}/concepts/${current.id}`">{{ current.title }}</RouterLink><span aria-current="page">{{ msg('foundation.optional_foundations') }}</span></nav>
    <h1 tabindex="-1">{{ msg('foundation.optional_theological_foundations_value', { value1: current.title }) }}</h1><SavePlace />
    <p>{{ msg('foundation.attributed_premises_of_leo_xiv_s_argument_these_are_available_for') }}</p>
    <ProseBlock v-if="current.foundation" :block="current.foundation" :scope="`${current.id}-foundation`" />
    <p v-else>{{ msg('foundation.this_concept_has_no_separate_theological_foundation_in_the_publis') }}</p>
    <ReturnLink /><RouterLink :to="`/${activeLocale}/concepts/${current.id}`">{{ msg('atlas.read_value', { value1: current.title }) }}</RouterLink>
  </template>
  <Unavailable v-else />
</template>
