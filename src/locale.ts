import locales from 'virtual:locale-registry'
import { ref, computed } from 'vue'
import { equivalentLocaleRoute } from '../scripts/locales.mjs'
export { locales }
export const activeLocale = ref('en')
export const localeInfo = computed(() => locales.find(locale => locale.id === activeLocale.value)!)
export function applyLocaleDocument(locale: string) {
  const entry = locales.find(entry => entry.id === locale)
  if (!entry) throw new Error(`Unavailable locale ${locale}`)
  document.documentElement.lang = entry.lang ?? entry.id
  document.documentElement.dir = entry.dir
}
export const localePath = (path: string) => equivalentLocaleRoute(path, activeLocale.value)
export const isolate = (value: string) => localeInfo.value.dir === 'rtl' ? `\u2068${value}\u2069` : value
export const number = (value: number) => {
  const locale = localeInfo.value.lang ?? activeLocale.value
  return isolate(new Intl.NumberFormat(locale, new Intl.Locale(locale).language === 'ar' ? { numberingSystem: 'arab' } : {}).format(value))
}
export const originalUrl = () => localeInfo.value.fixture ? '#fixture-source' : `https://www.vatican.va/content/leo-xiv/${activeLocale.value}/encyclicals/documents/20260515-magnifica-humanitas.html`
export const list = (values: string[]) => new Intl.ListFormat(activeLocale.value).format(values)
