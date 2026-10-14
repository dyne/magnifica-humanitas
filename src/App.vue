<script setup lang="ts">
import { ref } from 'vue'
const appearance = ref('system')
function setAppearance() {
  const root = document.documentElement
  const dark = appearance.value === 'dark' || (appearance.value === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  root.dataset.dyneTheme = dark ? 'dark' : 'light'
}
setAppearance()
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setAppearance)
const textSize = ref('100')
function setTextSize() { document.documentElement.style.fontSize = `${textSize.value}%` }
const links = [['Atlas', 'atlas'], ['Search', 'search'], ['Trails', 'trails'], ['Read continuously', 'read'], ['Saved', 'saved'], ['About', 'about']]
</script>

<template>
  <a class="skip" href="#main" @click.prevent="($refs.main as HTMLElement).focus()">Skip to reading</a>
  <header>
    <RouterLink class="brand" to="/en/atlas">Magnifica Humanitas</RouterLink>
    <nav aria-label="Main navigation">
      <RouterLink v-for="[label, path] in links" :key="path" :id="`nav-${path}`" :to="`/en/${path}`">{{ label }}</RouterLink>
    </nav>
    <div class="appearance"><label for="appearance">Appearance</label>
      <select id="appearance" v-model="appearance" @change="setAppearance">
        <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
      </select>
    </div>
    <div class="appearance"><label for="text-size">Text size</label>
      <select id="text-size" v-model="textSize" @change="setTextSize"><option value="100">100%</option><option value="125">125%</option><option value="150">150%</option><option value="200">200%</option></select>
    </div>
  </header>
  <main id="main" ref="main" tabindex="-1"><RouterView /></main>
  <footer>
    <p>An editorial reading of Leo XIV’s <cite>Magnifica Humanitas</cite>, 15 May 2026. You may understand an argument and disagree.</p>
    <p><RouterLink to="/en/about">Source and adaptation method</RouterLink> · <a href="https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html">Read the full original at the Holy See</a></p>
    <p>The original includes prayers and liturgical formulas excluded from this adaptation.</p>
  </footer>
</template>
