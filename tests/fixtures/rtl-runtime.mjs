/** Nonshipping synthetic layout fixture. Never a translation or official edition. */
export function createRtlFixture(reading, context, english) {
  const synthetic = value => {
    if (Array.isArray(value)) return value.map(synthetic);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key,
      ['text', 'title', 'question', 'label', 'method', 'contextLinkLabel', 'placementExplanation'].includes(key) && typeof child === 'string'
        ? 'نص تجريبي لاختبار اتجاه القراءة وتنسيق الواجهة مع مرجع ثابت 52 ووصلة example.test'
        : synthetic(child),
    ]));
  };
  const fixture = synthetic(reading);
  const source = synthetic(context);
  fixture.editionId = source.editionId = 'nonshipping-rtl-fixture';
  fixture.revision = 'fixture-only';
  const messages = Object.fromEntries(Object.entries(english).map(([key, value]) => [key, `واجهة تجريبية ${[...value.matchAll(/\{[^}]+\}/g)].map(match => match[0]).join(' ')}`]));
  messages['locale.language'] = 'لغة الاختبار';
  messages['locale.fixture_notice'] = 'Nonshipping RTL test fixture · نص تجريبي فقط، وليس ترجمة عربية أو طبعة رسمية.';
  messages['app.magnifica_humanitas'] = 'تجربة القراءة RTL fixture';
  return {
    library: { editionId: fixture.editionId, revision: fixture.revision, concepts: fixture.concepts, relations: fixture.relations, trails: fixture.trails },
    sequence: fixture.readingSequence, context: source, messages,
  };
}
