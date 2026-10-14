<script setup lang="ts">
import { localePath, originalUrl } from '../locale'
import { edition } from '../reading'
import { t as msg } from '../messages'
</script>
<template>
  <nav class="breadcrumbs" :aria-label="msg('about.breadcrumb')"><RouterLink :to="localePath('/atlas')">{{ msg('app.atlas') }}</RouterLink><span aria-current="page">{{ msg('app.about') }}</span></nav>
  <h1 tabindex="-1">{{ msg('about.about_this_reading') }}</h1>
  <p>{{ msg('about.this_is_an_english_editorial_reading_of_leo_xiv_s') }} <cite>{{ msg('app.magnifica_humanitas') }}</cite>{{ msg('about.dated_15_may_2026_its_source_edition_is') }} <bdi class="source-identity" dir="ltr">{{ edition }}</bdi>{{ msg('about.with_245_numbered_paragraphs') }}</p>
  <h2>{{ msg('about.source_and_editorial_voice') }}</h2>
  <p>{{ msg('about.exact_quotations_paraphrases_and_editorial_interpretations_are_la') }}</p>
  <h2>{{ msg('about.a_secular_entrance_with_attributed_foundations') }}</h2>
  <p>{{ msg('about.main_paths_begin_with_human_questions_necessary_qualifications_st') }}</p>
  <h2>{{ msg('about.read_the_original') }}</h2>
  <p><a :href="originalUrl()">{{ msg('app.read_the_full_original_at_the_holy_see') }}</a>{{ msg('about.it_includes_material_excluded_from_the_adaptation_the_original_so') }}</p>
  <p><a href="NOTICE.txt">{{ msg('about.source_and_asset_notices') }}</a> {{ msg('about.include_the_locally_served_fonts_and_theme') }}</p>
  <h2>{{ msg('about.your_reading') }}</h2>
  <p>{{ msg('about.no_accounts_profiling_or_engagement_tracking_the_complete_reading') }}</p>
  <RouterLink :to="localePath('/atlas')">{{ msg('about.return_to_the_atlas') }}</RouterLink>
</template>
