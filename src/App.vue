<script setup lang="ts">
import { activeLocale, localeInfo, locales, localePath, originalUrl } from './locale'
import { t as msg } from './messages'
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { equivalentLocaleRoute } from '../scripts/locales.mjs'
import { cancelReadingActivation } from './reading'
import { savePosition, cancelNavigation } from './navigation'
import { localData, setAppearance as saveAppearance, dataNotice, localStatus, storageUnavailable, retryStorage, undoSaved, undoRemoval } from './local-state'
const route = useRoute()
const router = useRouter()
const switchingLanguage = ref(false)
let languageRequest = 0
async function switchLanguage(event: Event) {
  const control = event.target as HTMLSelectElement
  const locale = control.value
  if (!locales.some(entry => entry.id === locale)) return
  if (locale === activeLocale.value) {
    if (switchingLanguage.value) {
      languageRequest++
      cancelReadingActivation()
      cancelNavigation()
      switchingLanguage.value = false
    }
    return
  }
  const token = ++languageRequest
  switchingLanguage.value = true
  savePosition('language', true)
  const destination = router.resolve(equivalentLocaleRoute(route.fullPath, locale))
  try {
    await router.push({ path: destination.path, query: destination.query, hash: destination.hash,
      state: { mhRestore: { focusId: 'language', top: window.scrollY } } })
  } finally {
    if (token === languageRequest) {
      switchingLanguage.value = false
      control.value = activeLocale.value
    }
  }
}
async function undoHere() {
  const blockId = undoSaved.value?.location.blockId
  undoRemoval()
  await nextTick()
  const block = blockId ? document.getElementById(blockId) : null
  const control = block?.querySelector<HTMLElement>('.save-place button') ?? document.querySelector<HTMLElement>('main .save-place button') ?? document.querySelector<HTMLElement>('main h1')
  control?.focus()
}
const appearance = computed({ get: () => localData.appearance, set: value => saveAppearance(value) })
function setAppearance() {
  const root = document.documentElement
  const dark = appearance.value === 'dark' || (appearance.value === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  root.dataset.dyneTheme = dark ? 'dark' : 'light'
}
setAppearance()
watch(appearance, setAppearance)
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setAppearance)
const textSize = ref('100')
function setTextSize() { document.documentElement.style.fontSize = `${textSize.value}%` }
const links = computed(() => [[msg('app.atlas'), 'atlas'], [msg('app.search'), 'search'], [msg('app.trails'), 'trails'], [msg('app.read_continuously'), 'read'], [msg('app.saved'), 'saved'], [msg('app.about'), 'about']])
</script>

<template>
  <a class="skip" href="#main" @click.prevent="($refs.main as HTMLElement).focus()">{{ msg('app.skip_to_reading') }}</a>
  <header>
    <RouterLink class="brand" :to="localePath('/atlas')">{{ msg('app.magnifica_humanitas') }}</RouterLink>
    <nav :aria-label="msg('app.main_navigation')">
      <RouterLink v-for="[label, path] in links" :key="path" :id="`nav-${path}`" :to="`/${activeLocale}/${path}`">{{ label }}</RouterLink>
    </nav>
    <div class="appearance language-control"><label for="language">{{ msg('locale.language') }}</label>
      <select id="language" :value="activeLocale" :aria-busy="switchingLanguage" @change="switchLanguage">
        <option v-for="locale in locales" :key="locale.id" :value="locale.id" :lang="locale.lang ?? locale.id" :dir="locale.dir">{{ locale.autonym }}</option>
      </select>
    </div>
    <div class="appearance"><label for="appearance">{{ msg('app.appearance') }}</label>
      <select id="appearance" v-model="appearance" @change="setAppearance">
        <option value="system">{{ msg('app.system') }}</option><option value="light">{{ msg('app.light') }}</option><option value="dark">{{ msg('app.dark') }}</option>
      </select>
    </div>
    <div class="appearance"><label for="text-size">{{ msg('app.text_size') }}</label>
      <select id="text-size" v-model="textSize" @change="setTextSize"><option v-for="size in [100, 125, 150, 200]" :key="size" :value="String(size)">{{ size }}%</option></select>
    </div>
  </header>
  <p v-if="localeInfo.fixture" class="fixture-notice" role="note">{{ msg('locale.fixture_notice') }}</p>
  <p v-if="switchingLanguage" class="language-status" role="status">{{ msg('locale.changing') }}</p>
  <main id="main" ref="main" tabindex="-1">
    <p v-if="dataNotice" role="status">{{ dataNotice }} <button @click="dataNotice = ''">{{ msg('app.dismiss_reading_data_notice') }}</button></p>
    <p class="local-status" role="status" aria-live="polite">{{ localStatus }}</p>
    <p v-if="undoSaved && route.path !== localePath('/saved')"><button @click="undoHere">{{ msg('app.undo_removal') }}</button></p>
    <p v-if="storageUnavailable">{{ msg('app.reading_places_are_temporary_in_this_tab') }} <button @click="retryStorage">{{ msg('app.retry_device_storage') }}</button></p>
    <RouterView :key="activeLocale" />
  </main>
  <footer>
    <p>{{ msg('app.an_editorial_reading_of_leo_xiv_s') }} <cite>{{ msg('app.magnifica_humanitas') }}</cite>{{ msg('app.15_may_2026_you_may_understand_an_argument_and_disagree') }}</p>
    <p><RouterLink :to="localePath('/about')">{{ msg('app.source_and_adaptation_method') }}</RouterLink> · <a :href="originalUrl()">{{ msg('app.read_the_full_original_at_the_holy_see') }}</a></p>
    <p>{{ msg('app.the_original_includes_prayers_and_liturgical_formulas_excluded_fr') }}</p>
  </footer>
</template>
