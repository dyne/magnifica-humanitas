<script setup lang="ts">
import { localePath } from '../locale'
import { t as msg } from '../messages'
import { useRoute } from 'vue-router'
const route = useRoute()
</script>
<template>
  <h1 tabindex="-1">{{ route.meta.planned ? msg('unavailable.this_reading_is_in_preparation') : msg('note.this_link_is_unavailable') }}</h1>
  <p v-if="route.meta.planned">{{ msg('unavailable.this_part_of_the_reviewed_reading_has_not_been_published_yet_you_') }}</p>
  <p v-else>{{ msg('unavailable.the_requested_page_is_unavailable_in_this_english_edition_check_t') }}</p>
  <p><RouterLink :to="localePath('/atlas')">{{ msg('note.explore_the_atlas') }}</RouterLink> · <RouterLink :to="localePath('/about')">{{ msg('app.source_and_adaptation_method') }}</RouterLink></p>
</template>
