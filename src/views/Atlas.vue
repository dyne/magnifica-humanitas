<script setup lang="ts">
import ReadingLink from '../components/ReadingLink.vue'
</script>
<template>
  <h1 tabindex="-1">Explore the ideas in Magnifica Humanitas</h1>
  <p class="idea">Choose a concept and follow its connections.</p>
  <p>These questions are editorial groupings of the source’s ideas.</p>
  <div class="regions">
    <section class="region" aria-labelledby="worth"><h2 id="worth">What makes a person worthy?</h2>
      <ul class="concept-links"><li><ReadingLink id="atlas-dignity" to="/en/concepts/dignity">Human dignity</ReadingLink></li><li><ReadingLink id="atlas-rights" to="/en/concepts/rights">Human rights</ReadingLink></li></ul>
    </section>
    <section class="region" aria-labelledby="together"><h2 id="together">How do people live well together?</h2>
      <ul class="concept-links"><li><ReadingLink id="atlas-common-good" to="/en/concepts/common-good">Common good</ReadingLink></li><li><ReadingLink id="atlas-ai-governance" to="/en/concepts/ai-governance">AI governance</ReadingLink></li></ul>
    </section>
  </div>
  <p class="edition-note">This edition offers four opening concepts and one trail. More concepts will follow after editorial review.</p>
</template>
