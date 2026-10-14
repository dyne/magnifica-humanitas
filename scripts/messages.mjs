import english from '../content/messages/en.json' with { type: 'json' };
export { english };
export const placeholders = value => [...String(value).matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(match => match[1]).sort();
export function validateMessages(messages) {
  const errors = [];
  for (const key of Object.keys(english)) {
    if (typeof messages?.[key] !== 'string' || !messages[key].trim()) errors.push(`Missing message ${key}`);
    else if (JSON.stringify(placeholders(messages[key])) !== JSON.stringify(placeholders(english[key]))) errors.push(`Placeholder mismatch ${key}`);
  }
  for (const key of Object.keys(messages ?? {})) if (!(key in english)) errors.push(`Unknown message ${key}`);
  return errors;
}
export function formatMessage(messages, key, values = {}) {
  if (typeof messages[key] !== 'string') throw new Error(`Missing message ${key}`);
  const required = new Set(placeholders(messages[key]));
  if ([...required].some(key => !(key in values)) || Object.keys(values).some(key => !required.has(key))) throw new Error(`Message values mismatch ${key}`);
  return messages[key].replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (_, name) => String(values[name] ?? ''));
}

export const dispositionKeys = Object.freeze({
  retain: 'disposition.retain', adapt: 'disposition.adapt', context: 'disposition.context', 'omit-devotional': 'disposition.omit-devotional',
});
export function formatDisposition(value, messages = english) {
  return formatMessage(messages, dispositionKeys[value] ?? 'disposition.unavailable');
}

/** Stable block IDs are identifiers, never display prose derived by splitting English words. */
export function formatSavedBlock(blockId, concepts, locale = 'en', messages = english) {
  const number = value => new Intl.NumberFormat(locale).format(value);
  if (/^read-p\d{3}$/.test(blockId)) return `§${number(Number(blockId.slice(6)))}`;
  for (const concept of concepts) {
    const suffixes = { idea: 'block.idea', distinction: 'block.distinction', connections: 'block.connections' };
    let section = Object.entries(suffixes).find(([suffix]) => blockId === `${concept.id}-${suffix}`)?.[1];
    const index = concept.reasoning.findIndex(block => block.id === blockId);
    if (section || index >= 0) return formatMessage(messages, 'block.description', {
      title: concept.title,
      section: section ? formatMessage(messages, section) : formatMessage(messages, 'block.reasoning', { number: number(index + 1) }),
    });
  }
  return formatMessage(messages, 'block.unavailable', { id: blockId });
}
