import { english, formatMessage } from './messages.mjs'
export const relationLabel = (type, messages = english) => formatMessage(messages, `relation.${type}`)
/** Search only reviewed, published adaptation; never raw originals. */
export function normalizeQuery(value, locale = 'en') {
  const language = new Intl.Locale(locale).language
  const lower = String(value ?? '').toLocaleLowerCase(locale)
  // Belarusian ў/у, й/и and ё/е are distinct letters, not disposable accents.
  const normalized = language === 'be' ? lower.normalize('NFC') : lower.normalize('NFD').replace(/\p{M}/gu, '')
  // Polish ł does not decompose under NFD, unlike the language's other accents.
  return (language === 'pl' ? normalized.replace(/ł/g, 'l') : normalized).trim().replace(/\s+/g, ' ')
}
export function searchPublished(library, sequence, query, { locale = 'en', messages = english } = {}) {
  const normalized = normalizeQuery(query, locale)
  const label = key => formatMessage(messages, key)
  const numeral = value => new Intl.NumberFormat(locale).format(value)
  if (!normalized) return []
  const digits = new Map(Array.from({ length: 10 }, (_, i) => [new Intl.NumberFormat(locale, { useGrouping: false }).format(i), String(i)]))
  for (let i = 0; i < 10; i++) { digits.set(String.fromCharCode(0x660 + i), String(i)); digits.set(String.fromCharCode(0x6f0 + i), String(i)) }
  const numeric = [...normalized].map(char => digits.get(char) ?? char).join('')
  const keyword = normalizeQuery(label('search.paragraph_keyword'), locale)
  const candidate = numeric.startsWith(keyword + ' ') ? numeric.slice(keyword.length + 1) : numeric
  const paragraph = candidate.match(/^(?:§\s*|p)?(\d{1,3})$/)
  if (paragraph) {
    const id = `p${paragraph[1].padStart(3, '0')}`
    const entry = sequence.find(b => b.contextId === id)
    return entry ? [{ id: entry.id, type: label('search.paragraph'), title: `§${numeral(Number(paragraph[1]))} · ${entry.title}`, preview: entry.explanation?.text ?? label('search.optional_preview'), sourceRefs: entry.sourceRefs, to: `/${locale}/read?at=${entry.id}`, rank: 0 }] : []
  }
  const rows = [
    ...library.concepts.map(c => ({ id: `concept-${c.id}`, type: label('search.concept'), title: c.title, preview: c.definition.text, sourceRefs: c.definition.sourceRefs, body: [c.definition.text, c.necessaryDistinction.text, ...c.reasoning.map(b => b.text)].join(' '), to: `/${locale}/concepts/${c.id}` })),
    ...library.relations.map(r => ({ id: r.id, type: r.placement === 'optional-foundations' ? label('search.foundation') : label('search.relationship'), title: `${library.concepts.find(c => c.id === r.from)?.title} ${relationLabel(r.type, messages)} ${library.concepts.find(c => c.id === r.to)?.title}`, preview: r.explanation.text, body: r.explanation.text, sourceRefs: r.explanation.sourceRefs, to: `/${locale}/relations/${r.id}` })),
    ...library.trails.map(t => ({ id: `trail-${t.id}`, type: label('search.trail'), title: t.title, preview: t.introduction.text, body: `${t.question} ${t.introduction.text} ${t.qualification.text}`, sourceRefs: t.introduction.sourceRefs, to: `/${locale}/trails/${t.id}/steps/${t.steps[0].id}` })),
    ...sequence.map(b => ({ id: b.id, type: b.placement === 'main' ? label('search.paragraph') : label('search.optional_context'), title: `§${numeral(Number(b.contextId.slice(1)))} · ${b.title}`, preview: b.explanation?.text ?? label('search.optional_preview'), body: b.explanation?.text ?? '', sourceRefs: b.sourceRefs, to: `/${locale}/read?at=${b.id}` })),
  ]
  const terms = normalized.split(' ')
  return rows.flatMap(row => {
    const title = normalizeQuery(row.title, locale), body = normalizeQuery(row.body, locale)
    const rank = title === normalized ? 0 : terms.every(term => title.includes(term)) ? 1 : terms.every(term => `${title} ${body}`.includes(term)) ? 2 : -1
    if (rank < 0) return []
    return [{ ...row, rank }]
  }).sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id, locale))
}
