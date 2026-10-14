<script setup lang="ts">
import { localePath } from '../locale'
import { t as msg } from '../messages'
import { localData, describeLocation } from '../local-state'
import ResumeLink from './ResumeLink.vue'
</script>
<template><p v-if="localData.last" class="return"><ResumeLink id="resume-last-invitation" :location="localData.last">{{ msg('saved.resume_value', { value1: describeLocation(localData.last) }) }}</ResumeLink> · <RouterLink :to="localePath('/saved')">{{ msg('saved.saved_places_and_recent_path') }}</RouterLink></p></template>
