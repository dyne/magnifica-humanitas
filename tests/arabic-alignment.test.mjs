import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relationTypes } from '../scripts/validate-editorial.mjs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const corpus = read('content/source/ar/corpus.json');
const review = read('content/editorial/ar/alignment-review.json');
const sourceAlignment = read('content/source/ar/alignment.json');
const manifest = read('content/source/ar/manifest.json');
const concepts = read('content/editorial/concepts.json').concepts;
const paragraphs = new Map(corpus.paragraphs.map(p => [p.id, p]));
const hash = text => createHash('sha256').update(text).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const intersects = (a, b) => a.paragraphId === b.paragraphId && a.start < b.end && b.start < a.end;
const substantiveNotes = ['n132', 'n174', 'n175', 'n182'];
const precedingKind = text => /^(?:راجع )?المرجع نفسه/u.test(text) ? 'same-work'
  : /^(?:راجع )?المؤلّف نفسه/u.test(text) ? 'same-author' : undefined;

// Internal source-comparison records. Later public reading and interface gates
// remain independent; exact anchors cannot prove faithful explanatory prose.
function alignmentErrors(data) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  check(data.locale === 'ar' && data.editionId === corpus.editionId, 'edition');
  check(data.sourceHtmlSha256 === corpus.sourceHtmlSha256, 'snapshot');
  check(data.sourceAuthority.selectedFormat === manifest.selectedFormat && data.sourceAuthority.selectedFormat === 'HTML'
    && data.sourceAuthority.htmlPath === 'content/source/ar/official.html'
    && data.sourceAuthority.linkedPdfLanguage === manifest.inspection.pdfComparison.actualLanguage
    && data.sourceAuthority.linkedPdfLanguage === 'ar'
    && data.sourceAuthority.linkedPdfUse === 'comparison-evidence-only', 'Arabic HTML authority');
  check(equal(data.coverage.map(r => r.paragraphId), corpus.paragraphs.map(p => p.id)), 'coverage order/completeness');
  check(new Set(data.coverage.map(r => r.reviewInstruction)).size === 245, 'individual instructions');
  for (const r of data.coverage) {
    const p = paragraphs.get(r.paragraphId);
    const mapping = sourceAlignment.paragraphs.find(a => a.paragraphId === r.paragraphId);
    check(mapping?.englishParagraphId === r.paragraphId && mapping?.sourceNumber === p?.number && mapping?.sha256 === r.sourceSha256, `paragraph correspondence ${r.paragraphId}`);
    check(r.sourceSha256 === p?.sha256 && p?.sha256 === hash(p.text), `coverage hash ${r.paragraphId}`);
    check(['retain', 'adapt', 'context'].includes(r.disposition), `whole omission ${r.paragraphId}`);
    check(Boolean(r.reviewInstruction?.trim()) && ['accepted-common-policy-compared-with-local-edition', 'local-edition-correction-of-accepted-common-policy'].includes(r.instructionProvenance), `instruction ${r.paragraphId}`);
    check(r.localWitness?.paragraphId === r.paragraphId, `local witness identity ${r.paragraphId}`);
    check(r.conceptIds.length > 0 && r.conceptIds.every(id => concepts.some(c => c.id === id)), `coverage concepts ${r.paragraphId}`);
    check(typeof r.optionalFaithPremise === 'boolean', `premise placement ${r.paragraphId}`);
    for (const q of r.necessaryQualifications) check(q.kind === 'editorial-instruction' && q.sourceRefs.includes(r.paragraphId) && q.sourceRefs.every(id => paragraphs.has(id)), `qualification ${r.paragraphId}`);
  }
  check(equal(data.terms.map(t => t.conceptId), concepts.map(c => c.id)), 'concept identities');
  const types = new Set(data.relationLabels.map(l => l.type));
  check(data.relationLabels.length === relationTypes.size && types.size === relationTypes.size && [...relationTypes].every(t => types.has(t)), 'relation labels');
  for (const l of data.relationLabels) check(l.kind === 'editorial-interpretation' && Boolean(l.label.trim()) && l.sourceRefs.includes(l.anchor.paragraphId) && l.sourceRefs.every(id => paragraphs.has(id)), 'relation interpretation');
  const quotes = [
    ...data.coverage.map(r => r.localWitness), ...data.terms.map(t => t.anchor), ...data.relationLabels.map(r => r.anchor),
    ...data.exclusions.flatMap(e => [e.sourceSpan, e.reviewContext]),
    ...data.protectedSpans.map(p => p.sourceSpan), ...data.faithPremises.map(p => p.reviewContext),
  ];
  for (const q of quotes) {
    const p = paragraphs.get(q.paragraphId);
    check(q.kind === 'quotation' && Number.isInteger(q.start) && Number.isInteger(q.end) && q.start >= 0 && q.end > q.start && q.end <= (p?.text.length ?? 0), `span coordinates ${q.paragraphId}`);
    check(p?.text.slice(q.start, q.end) === q.text, `contiguous Arabic span ${q.paragraphId}`);
    check(q.sourceSha256 === p?.sha256 && q.sha256 === hash(q.text), `span hashes ${q.paragraphId}`);
  }
  for (const t of data.terms) check(t.sourceRefs.includes(t.anchor.paragraphId) && t.sourceRefs.every(id => paragraphs.has(id)) && Boolean(t.label.trim()), `term refs ${t.conceptId}`);
  check(equal(data.faithPremises.map(p => p.paragraphId), data.coverage.filter(r => r.optionalFaithPremise).map(r => r.paragraphId)), 'faith premise completeness');
  for (const p of data.faithPremises) {
    check(p.placement === 'optional-foundations' && p.paragraphId === p.reviewContext.paragraphId && p.reviewContext.text === paragraphs.get(p.paragraphId)?.text, 'complete premise context');
    check(p.instructions.length > 0 && p.instructions.every(i => i.kind === 'source-annotation' && i.sourceRefs.includes(p.paragraphId)), 'premise attribution');
  }
  for (const e of data.exclusions) {
    check(e.sourceSpan.paragraphId === e.reviewContext.paragraphId && e.reviewContext.text === paragraphs.get(e.sourceSpan.paragraphId)?.text, 'complete exclusion context');
    check(e.preserve.trim().length > 40, 'exclusion preservation instruction');
    check(!data.protectedSpans.some(p => intersects(e.sourceSpan, p.sourceSpan)), 'protected/excluded overlap');
    check(!e.matchScope || e.matchScope === 'global' || (e.matchScope === 'source-location' && e.scope === 'clause' && e.matchScopeReview?.length > 80), 'reviewed matching scope');
  }
  check(data.exclusions.length === 18 && new Set(data.exclusions.map(e => e.id)).size === 18, 'intentional exclusions');
  check(equal(data.notes.map(n => n.noteId), corpus.footnotes.map(n => n.id)), 'note mapping completeness');
  for (const n of data.notes) {
    const source = corpus.footnotes.find(s => s.id === n.noteId);
    const mapping = sourceAlignment.notes.find(s => s.noteId === n.noteId);
    check(n.englishNoteId === mapping?.englishNoteId && n.mapping === 'same-number-reviewed', `note identity ${n.noteId}`);
    check(n.sourceSha256 === source?.sha256 && source?.sha256 === hash(source.text), `note hash ${n.noteId}`);
    check(equal(n.paragraphIds, source?.paragraphIds), `note backlinks ${n.noteId}`);
    check(n.sourceMarker === source?.sourceMarker && equal(n.sourceLinks, source?.sourceLinks), `official note metadata ${n.noteId}`);
    if (n.previousNoteId) check(n.previousNoteId === corpus.footnotes[source.number - 2]?.id, `preceding citation ${n.noteId}`);
    check(Boolean(n.previousNoteId) === Boolean(precedingKind(source.text)) && n.previousReferenceKind === precedingKind(source.text), `preceding citation presence/kind ${n.noteId}`);
    check(n.screen === (substantiveNotes.includes(n.noteId) ? 'argument-and-citation' : 'bibliographic'), `local note screen ${n.noteId}`);
  }
  return errors;
}

const protectedText = id => review.protectedSpans.filter(p => p.sourceSpan.paragraphId === id).map(p => p.sourceSpan.text).join(' ');
const instruction = id => review.coverage.find(p => p.paragraphId === id).reviewInstruction;

test('Arabic alignment binds complete local coverage, terms, relations and exact UTF-16 spans', () => {
  assert.deepEqual(alignmentErrors(review), []);
  assert.equal(hash(readFileSync(new URL('../content/source/ar/official.html', import.meta.url))), review.sourceHtmlSha256);
  assert.deepEqual([review.coverage.length, review.terms.length, review.relationLabels.length, review.faithPremises.length, review.exclusions.length, review.protectedSpans.length, review.notes.length], [245, 27, 9, 87, 18, 83, 224]);
  assert.equal(review.coverage.filter(r => r.disposition === 'context').length, 42);
  assert.equal(review.coverage.reduce((n, r) => n + r.necessaryQualifications.length, 0), 121);
  assert.match(review.method, /not public reading copy or native-speaker proofreading/);
  assert.match(review.method, /common English internal instructions are inherited policy/);
  assert.equal(review.terms.find(t => t.conceptId === 'dignity').anchor.text, 'الكرامة الوجوديّة');
  assert.equal(review.terms.find(t => t.conceptId === 'subsidiarity').label, 'اللامركزيّة والتّكامل في اتّخاذ القرار');
  for (const t of [...review.terms, ...review.relationLabels]) assert.match(t.label, /\p{Script=Arabic}/u);
});

test('Arabic notes retain metadata and independently resolved same-work and same-author references', () => {
  assert.deepEqual(review.notes.filter(n => n.screen === 'argument-and-citation').map(n => n.noteId), substantiveNotes);
  assert.equal(review.notes.filter(n => n.previousReferenceKind === 'same-work').length, 35);
  assert.equal(review.notes.filter(n => n.previousReferenceKind === 'same-author').length, 24);
  for (const id of ['n003', 'n026', 'n033', 'n035', 'n037', 'n040', 'n066', 'n067', 'n193', 'n201', 'n202']) assert.equal(review.notes.find(n => n.noteId === id).previousReferenceKind, 'same-author');
  for (const id of ['n002', 'n007', 'n163', 'n204', 'n207', 'n211']) assert.equal(review.notes.find(n => n.noteId === id).previousReferenceKind, 'same-work');
  assert.match(review.notes[162].referenceReview, /closing Benedict/);
  assert.equal(review.notes[216].previousNoteId, undefined);
  assert.equal(review.notes[132].screen, 'bibliographic');
  assert.match(review.notes[132].referenceReview, /No Russian translator caveat/);
  const bad = structuredClone(review);
  bad.notes[32].previousReferenceKind = 'same-work';
  delete bad.notes[206].previousNoteId;
  bad.notes[132].screen = 'argument-and-citation';
  bad.notes[216].previousNoteId = 'n216';
  bad.notes[203].previousNoteId = 'n202';
  for (const e of ['preceding citation presence/kind n033', 'preceding citation presence/kind n207', 'local note screen n133', 'preceding citation presence/kind n217', 'preceding citation n204']) assert.ok(alignmentErrors(bad).includes(e), e);
});

test('Arabic evidence rejects foreign coordinates, spliced quotes, stale hashes and missing mappings', () => {
  const bad = structuredClone(review);
  bad.sourceAuthority.selectedFormat = 'PDF';
  bad.sourceHtmlSha256 = '0'.repeat(64);
  bad.coverage[243].sourceSha256 = '0'.repeat(64);
  bad.coverage[0].localWitness.paragraphId = 'p002';
  bad.terms[0].anchor.start++;
  bad.terms[0].sourceRefs.push('p999');
  const q = bad.protectedSpans[0].sourceSpan;
  q.text = q.text.slice(0, 10) + q.text.slice(-10);
  q.sha256 = hash(q.text);
  bad.relationLabels[0].type = 'invented';
  bad.relationLabels[1].kind = 'quotation';
  const errors = alignmentErrors(bad);
  for (const e of ['Arabic HTML authority', 'snapshot', 'coverage hash p244', 'local witness identity p001', 'term refs dignity', 'relation labels', 'relation interpretation']) assert.ok(errors.includes(e), e);
  assert.ok(errors.some(e => e.includes('contiguous Arabic span')));
  const missing = structuredClone(review);
  missing.notes.splice(83, 1);
  missing.notes[0].paragraphIds = ['p002'];
  assert.ok(alignmentErrors(missing).includes('note mapping completeness'));
  assert.ok(alignmentErrors(missing).includes('note backlinks n001'));
});

test('Arabic devotional exclusions retain complete contexts and separate prayer from surrounding thought', () => {
  assert.deepEqual(review.exclusions.filter(e => e.matchScope === 'source-location').map(e => [e.id, e.sourceSpan.text]), [['p241-exclusion-1', 'والصّلاة']]);
  assert.ok(!review.exclusions.some(e => ['p008', 'p121', 'p125', 'p148', 'p176'].includes(e.sourceSpan.paragraphId)));
  for (const id of ['p013', 'p074', 'p090', 'p112', 'p133', 'p147']) assert.ok(review.faithPremises.some(p => p.paragraphId === id));
  const bad = structuredClone(review);
  bad.coverage.pop();
  bad.coverage[243].disposition = 'omit-devotional';
  bad.faithPremises.splice(bad.faithPremises.findIndex(p => p.paragraphId === 'p112'), 1);
  bad.protectedSpans.push({ sourceSpan: structuredClone(bad.exclusions[0].sourceSpan) });
  for (const e of ['coverage order/completeness', 'whole omission p244', 'faith premise completeness', 'protected/excluded overlap']) assert.ok(alignmentErrors(bad).includes(e), e);
  const retained = {
    p228: [/سلام مجرَّد من السّلاح.*يُجرِّدُ من السّلاح.*متواضع ومثابر/s, /والالتزام بتحقيقه في علاقاتنا وفي المجتمع/],
    p234: [/كونوا أعضاء في جسد المسيح/], p235: [/تكوِّن كلّ حياتنا.*العدل والمشاركة/s],
    p241: [/الإصغاء والشّجاعة.*والمسؤوليّة/s], p243: [/الرّومان الذين يسيطرون على أرضها/],
    p244: [/الأرملة واليتيم والغريب، والطّفل الجريح والمنفيّ واللاجئ/], p245: [/ولْنَتَشارَك في ما نحن عليه وما لدينا/],
  };
  for (const [id, expressions] of Object.entries(retained)) for (const exp of expressions) assert.match(protectedText(id), exp, id);
});

test('Arabic dignity, rights, property and supported local agency retain their qualifications', () => {
  const required = {
    p052: [/الكرامة الأخلاقيّة.*الكرامة الاجتماعيّة.*كرامة الحياة.*الكرامة الوجوديّة/s, /لا يمكن لأيّة خطيئة، وأيّ فشل، وأيّة إهانة، وأيّ استبعاد/],
    p055: [/منذ لحظة تكوينه.*الإجهاض المتعمّد.*القتل الرّحيم/s], p066: [/يوجد حقّ في الملكيّة الخاصّة.*خاضعًا/s],
    p069: [/لا يبرّر لامبالاة الدّولة/], p072: [/قواعد عادلة وحماية فعّالة/],
    p081: [/طرق آمنة وقانونيّة.*البقاء في أرضهم/s], p165: [/الاتّحاد الثّابت بين رجل وامرأة/],
  };
  for (const [id, expressions] of Object.entries(required)) for (const exp of expressions) assert.match(protectedText(id), exp, id);
});

test('Arabic AI capabilities, attributed limits, care obligation and work distinctions coexist', () => {
  const required = {
    p097: [/ليس هدفي هنا أن أقدّم دراسة/], p098: [/يصير قديمًا في وقتٍ قصير.*لا نعرف إلّا القليل/s],
    p099: [/تتفوّق مرارًا.*فوائد ملموسة.*لا يعيش خبرة.*لا يمتلك ضميرًا أخلاقيًّا/s],
    p109: [/شرط مسبق يجب ممارسته في عمليّة التّصميم نفسها/],
    p116: [/تيّارات وحساسيّات متعدّدة.*أشكالها الأكثر جذريّة.*فرَضيّة/s],
    p118: [/يجب علينا أن نسعى إلى إزالة الألم.*محدوديّتنا الجوهريّة/s],
    p128: [/بنعمة الله.*الخطأ بداية لتغيير/s], p149: [/ضروريّة أحيانًا في الحالات الطّارئة/],
    p152: [/من المُستحسن.*الشّاقة أو المتكرّرة أو الخطرة/s],
    p153: [/لا يوجد نموذج واحد للتغيير.*الوطنيّ والمحلّيّ/s], p154: [/البطالة إلى تقويض المشاركة الاجتماعيّة/],
  };
  for (const [id, expressions] of Object.entries(required)) for (const exp of expressions) assert.match(protectedText(id), exp, id);
  assert.match(instruction('p118'), /obligation to strive to remove suffering/);
});

test('Arabic institutional scrutiny retains abuse, slavery delay, legitimation and pardon', () => {
  const required = {
    p089: [/الرّوحيّة والاقتصاديّة والمؤسّساتيّة والجنسيّة، واعتداءات السُّلطة والضّمير/],
    p138: [/الصّحفيّين.*ضحايا الانتهاكات.*ألّا ننتظر/s],
    p176: [/التّأخير.*تمتلك عبيدًا.*إضفاء الشّرعيّة.*ثمانية عشر قرنًا.*أطلب بكلّ صدق المغفرة/s],
    p178: [/القدرة على تقرير كيفيّة استخدامها/], p173: [/النّساء.*الأطفال.*الاتجار بالبشر/s],
  };
  for (const [id, expressions] of Object.entries(required)) for (const exp of expressions) assert.match(protectedText(id), exp, id);
  assert.match(corpus.footnotes[173].text, /الضّغوط السّياسيّة.*الاقتصاديّة/s);
  assert.match(corpus.footnotes[174].text, /1866.*بدون أن تحكم عليها بشكل كامل/s);
});

test('Arabic military safeguards and active conclusion survive the exclusions', () => {
  const required = {
    p192: [/الدّفاع المشروع عن النّفس بمعناه الدّقيق/], p197: [/الملاذ الأخير في حالة الدّفاع المشروع/],
    p198: [/يجب ألّا نَسند.*قرارات مُميتة.*لا رجعة فيها.*القِيَم والحُكم الرّشيد/s],
    p199: [/سلسلة المسؤوليّات.*وقت الحكم الأخلاقيّ.*المقاتلين وغير المقاتلين/s], p200: [/رقابة بشريّة فعليّة وواعية ومسؤولة/],
    p231: [/ببكاء الصّغار، وضعف المسنّين، وصمت الضّحايا/], p236: [/دور نشط، دون اللجوء إلى الرّوحانيّة المجرّدة/],
    p239: [/وزيارة من هُم وحدهم، وخدمة الفقراء/], p240: [/ظروف العمل المخفيّة وراء أجهزتنا/],
  };
  for (const [id, expressions] of Object.entries(required)) for (const exp of expressions) assert.match(protectedText(id), exp, id);
  assert.match(instruction('p198'), /no as-far-as-possible/);
});

test('Arabic frozen defects, scriptural references and differences stay local', () => {
  assert.match(paragraphs.get('p051').text, /مليار$/u);
  assert.match(paragraphs.get('p128').text, /^عنما/u);
  assert.match(paragraphs.get('p159').text, /إنّها تُبَيِّن الأنشطة/);
  assert.match(paragraphs.get('p215').text, /لماذا تريد أنت أن تتعارض مع العدل؟/);
  assert.match(paragraphs.get('p215').text, /المزمور 85، 11/);
  assert.deepEqual(corpus.footnotes[83].paragraphIds, ['p064']);
  assert.ok(paragraphs.get('p066').sourceLinks.some(l => l.name === '_ftnref71' && l.text === ''));
  assert.ok(!corpus.footnotes[70].paragraphIds.includes('p066'));
  assert.match(corpus.footnotes[132].text, /بوسطن 1963، 213/);
  assert.match(instruction('p169'), /العمل والخدمات والرّاحة/);
  assert.match(instruction('p133'), /does not literally name original sin/);
  assert.match(instruction('p241'), /listening and courage/);
  for (const id of ['p051', 'p052', 'p066', 'p068', 'p108', 'p111', 'p116', 'p118', 'p128', 'p133', 'p159', 'p169', 'p176', 'p198', 'p215', 'p237', 'p241']) assert.ok(review.editionDifferences.some(d => d.paragraphId === id), id);
  for (const id of ['n026', 'n133', 'n163', 'n175', 'n182', 'n193', 'n201', 'n204', 'n211', 'n216', 'n217']) assert.ok(review.editionDifferences.some(d => d.noteId === id), id);
});

test('Arabic qualification instructions do not reintroduce foreign limiting clauses', () => {
  const q = id => review.coverage.find(r => r.paragraphId === id).necessaryQualifications.map(x => x.text).join(' ');
  assert.match(q('p118'), /obligation to strive to remove suffering/);
  assert.match(q('p120'), /obligation to strive to remove suffering/);
  assert.match(q('p198'), /positive importance of values and prudent judgment/);
  assert.match(q('p198'), /no as-far-as-possible/);
  assert.doesNotMatch(q('p198'), /still allow values and boundaries in systems as far as possible/);
  assert.match(review.faithPremises.find(p => p.paragraphId === 'p133').instructions[0].description, /does not literally name original sin/);
});
