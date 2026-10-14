<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>
<template>
  <h1 tabindex="-1">{{ route.meta.planned ? 'This reading is in preparation' : 'This link is unavailable' }}</h1>
  <p v-if="route.meta.planned">This part of the reviewed reading has not been published yet. You can explore the opening concepts or verify the complete original.</p>
  <p v-else>The requested page is unavailable in this English edition. Check the link or return to the atlas.</p>
  <p><RouterLink to="/en/atlas">Explore the atlas</RouterLink> · <RouterLink to="/en/about">Source and adaptation method</RouterLink></p>
</template>
