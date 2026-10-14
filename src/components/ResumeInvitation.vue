<script setup lang="ts">
import { localData, describeLocation } from '../local-state'
import ResumeLink from './ResumeLink.vue'
</script>
<template><p v-if="localData.last" class="return"><ResumeLink id="resume-last-invitation" :location="localData.last">Resume {{ describeLocation(localData.last) }}</ResumeLink> · <RouterLink to="/en/saved">Saved places and recent path</RouterLink></p></template>
