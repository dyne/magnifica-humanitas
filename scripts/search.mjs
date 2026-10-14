export const relationLabel = type => type.replaceAll('-', ' ')
/** Search only reviewed, published adaptation; never raw originals. */
export function normalizeQuery(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('en').trim().replace(/\s+/g, ' ')
}
export function searchPublished(library, sequence, query) {
  const normalized = normalizeQuery(query)
  if (!normalized) return []
  const paragraph = normalized.match(/^(?:§\s*|p|paragraph\s+)?(\d{1,3})$/)
  if (paragraph) {
    const id = `p${paragraph[1].padStart(3, '0')}`
    const entry = sequence.find(b => b.contextId === id)
    return entry ? [{ id: entry.id, type: 'Adapted paragraph', title: `§${Number(paragraph[1])} · ${entry.title}`, preview: entry.explanation?.text ?? 'Optional historical or theological source context.', sourceRefs: entry.sourceRefs, to: `/en/read?at=${entry.id}`, rank: 0 }] : []
  }
  const rows = [
    ...library.concepts.map(c => ({ id: `concept-${c.id}`, type: 'Concept / glossary', title: c.title, preview: c.definition.text, sourceRefs: c.definition.sourceRefs, body: [c.definition.text, c.necessaryDistinction.text, ...c.reasoning.map(b => b.text)].join(' '), to: `/en/concepts/${c.id}` })),
    ...library.relations.map(r => ({ id: r.id, type: r.placement === 'optional-foundations' ? 'Optional foundation relationship' : 'Relationship', title: `${library.concepts.find(c => c.id === r.from)?.title} ${relationLabel(r.type)} ${library.concepts.find(c => c.id === r.to)?.title}`, preview: r.explanation.text, body: r.explanation.text, sourceRefs: r.explanation.sourceRefs, to: `/en/relations/${r.id}` })),
    ...library.trails.map(t => ({ id: `trail-${t.id}`, type: 'Trail', title: t.title, preview: t.introduction.text, body: `${t.question} ${t.introduction.text} ${t.qualification.text}`, sourceRefs: t.introduction.sourceRefs, to: `/en/trails/${t.id}/steps/${t.steps[0].id}` })),
    ...sequence.map(b => ({ id: b.id, type: b.placement === 'main' ? 'Adapted paragraph' : 'Optional source context', title: `§${Number(b.contextId.slice(1))} · ${b.title}`, preview: b.explanation?.text ?? 'Optional historical or theological source context.', body: b.explanation?.text ?? '', sourceRefs: b.sourceRefs, to: `/en/read?at=${b.id}` })),
  ]
  const terms = normalized.split(' ')
  return rows.flatMap(row => {
    const title = normalizeQuery(row.title), body = normalizeQuery(row.body)
    const rank = title === normalized ? 0 : terms.every(term => title.includes(term)) ? 1 : terms.every(term => `${title} ${body}`.includes(term)) ? 2 : -1
    if (rank < 0) return []
    return [{ ...row, rank }]
  }).sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id, 'en'))
}
