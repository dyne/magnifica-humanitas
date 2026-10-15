import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relationTypes } from '../scripts/validate-editorial.mjs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const corpus = read('content/source/ru/corpus.json');
const review = read('content/editorial/ru/alignment-review.json');
const sourceAlignment = read('content/source/ru/alignment.json');
const manifest = read('content/source/ru/manifest.json');
const concepts = read('content/editorial/concepts.json').concepts;
const paragraphs = new Map(corpus.paragraphs.map(p => [p.id, p]));
const hash = text => createHash('sha256').update(text).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const intersects = (a, b) => a.paragraphId === b.paragraphId && a.start < b.end && b.start < a.end;
const substantiveNotes = ['n132', 'n133', 'n174', 'n175', 'n182'];
const precedingKind = text => /^(?:Ср\. )?там же(?:[., ]|$)/iu.test(text) ? 'same-work'
  : /^(?:Ср\. )?он же(?:[, ]|$)/iu.test(text) ? 'same-author' : undefined;

// Internal source-comparison records. Later public reading and interface gates
// remain independent; exact anchors cannot prove faithful explanatory prose.
function alignmentErrors(data) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  check(data.locale === 'ru' && data.editionId === corpus.editionId, 'edition');
  check(data.sourceHtmlSha256 === corpus.sourceHtmlSha256, 'snapshot');
  check(data.sourceAuthority.selectedFormat === manifest.selectedFormat && data.sourceAuthority.selectedFormat === 'HTML'
    && data.sourceAuthority.htmlPath === 'content/source/ru/official.html'
    && data.sourceAuthority.linkedPdfLanguage === manifest.inspection.pdfComparison.actualLanguage
    && data.sourceAuthority.linkedPdfLanguage === 'ru'
    && data.sourceAuthority.linkedPdfUse === 'comparison-evidence-only', 'Russian HTML authority');
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
    check(p?.text.slice(q.start, q.end) === q.text, `contiguous Russian span ${q.paragraphId}`);
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

test('Russian alignment binds complete local coverage, terms, relations and exact spans', () => {
  assert.deepEqual(alignmentErrors(review), []);
  assert.equal(hash(readFileSync(new URL('../content/source/ru/official.html', import.meta.url))), review.sourceHtmlSha256);
  assert.equal(review.coverage.length, 245);
  assert.equal(review.coverage.filter(r => r.disposition === 'context').length, 42);
  assert.equal(review.terms.length, 27);
  assert.equal(review.relationLabels.length, 9);
  assert.equal(review.faithPremises.length, 87);
  assert.equal(review.protectedSpans.length, 82);
  assert.equal(review.coverage.reduce((n, r) => n + r.necessaryQualifications.length, 0), 121);
  assert.match(review.method, /not public reading copy or native-speaker proofreading/);
  assert.match(review.method, /common English internal instructions are inherited policy/);
  assert.equal(review.terms.find(t => t.conceptId === 'dignity').anchor.text, 'достоинство онтологическое');
  assert.equal(review.terms.find(t => t.conceptId === 'subsidiarity').label, 'Субсидиарность');
  assert.equal(review.terms.find(t => t.conceptId === 'institutional-accountability').anchor.text, 'подотчетностью');
});

test('Russian notes retain all local bodies, metadata and independently resolved abbreviations', () => {
  assert.equal(review.notes.length, 224);
  assert.deepEqual(review.notes.filter(n => n.screen === 'argument-and-citation').map(n => n.noteId), substantiveNotes);
  assert.equal(review.notes.filter(n => n.previousReferenceKind === 'same-work').length, 35);
  assert.equal(review.notes.filter(n => n.previousReferenceKind === 'same-author').length, 20);
  for (const id of ['n026', 'n028', 'n030', 'n066', 'n067', 'n201', 'n202']) assert.equal(review.notes.find(n => n.noteId === id).previousReferenceKind, 'same-author');
  for (const id of ['n002', 'n007', 'n163', 'n204', 'n207', 'n211']) assert.equal(review.notes.find(n => n.noteId === id).previousReferenceKind, 'same-work');
  assert.match(review.notes[162].referenceReview, /closing Benedict/);
  assert.equal(review.notes[216].previousNoteId, undefined);
  assert.match(review.notes[216].referenceReview, /internal paragraph reference/);
  const bad = structuredClone(review);
  bad.notes[65].previousReferenceKind = 'same-work';
  bad.notes[203].previousNoteId = 'n202';
  delete bad.notes[206].previousNoteId;
  bad.notes[132].screen = 'bibliographic';
  bad.notes[216].previousNoteId = 'n216';
  assert.ok(alignmentErrors(bad).includes('preceding citation presence/kind n066'));
  assert.ok(alignmentErrors(bad).includes('preceding citation n204'));
  assert.ok(alignmentErrors(bad).includes('preceding citation presence/kind n207'));
  assert.ok(alignmentErrors(bad).includes('local note screen n133'));
  assert.ok(alignmentErrors(bad).includes('preceding citation presence/kind n217'));
});

test('Russian evidence rejects foreign offsets, splicing, stale hashes and invented refs', () => {
  const bad = structuredClone(review);
  bad.sourceAuthority.selectedFormat = 'PDF';
  bad.sourceHtmlSha256 = '0'.repeat(64);
  bad.coverage[243].sourceSha256 = '0'.repeat(64);
  bad.coverage[0].localWitness.paragraphId = 'p002';
  bad.terms[0].anchor.start = 609;
  bad.terms[0].sourceRefs.push('p999');
  const q = bad.protectedSpans[0].sourceSpan;
  q.text = q.text.slice(0, 10) + q.text.slice(-10);
  q.sha256 = hash(q.text);
  bad.relationLabels[0].type = 'invented';
  bad.relationLabels[1].kind = 'quotation';
  const errors = alignmentErrors(bad);
  for (const expected of ['Russian HTML authority', 'snapshot', 'coverage hash p244', 'local witness identity p001', 'term refs dignity', 'relation labels', 'relation interpretation']) assert.ok(errors.includes(expected), expected);
  assert.ok(errors.some(e => e.includes('contiguous Russian span')));
  const missing = structuredClone(review);
  missing.notes.splice(83, 1);
  missing.notes[0].paragraphIds = ['p002'];
  assert.ok(alignmentErrors(missing).includes('note mapping completeness'));
  assert.ok(alignmentErrors(missing).includes('note backlinks n001'));
});

test('Russian exclusions preserve complete mixed contexts and separate prayer from responsibility', () => {
  assert.equal(review.exclusions.length, 18);
  assert.deepEqual(review.exclusions.filter(e => e.matchScope === 'source-location').map(e => [e.id, e.sourceSpan.text]), [['p241-exclusion-1', 'молитву и']]);
  assert.ok(!review.exclusions.some(e => ['p008', 'p121', 'p125', 'p148', 'p176'].includes(e.sourceSpan.paragraphId)));
  for (const id of ['p013', 'p074', 'p090', 'p112', 'p133', 'p147']) assert.ok(review.faithPremises.some(p => p.paragraphId === id));
  const bad = structuredClone(review);
  bad.coverage.pop();
  bad.coverage[243].disposition = 'omit-devotional';
  bad.faithPremises.splice(bad.faithPremises.findIndex(p => p.paragraphId === 'p133'), 1);
  bad.exclusions[0].matchScope = 'source-location';
  assert.ok(alignmentErrors(bad).includes('coverage order/completeness'));
  assert.ok(alignmentErrors(bad).includes('whole omission p244'));
  assert.ok(alignmentErrors(bad).includes('faith premise completeness'));
  assert.ok(alignmentErrors(bad).includes('reviewed matching scope'));
  const overlap = structuredClone(review);
  overlap.exclusions[0].sourceSpan = structuredClone(review.protectedSpans.find(p => p.sourceSpan.paragraphId === 'p176').sourceSpan);
  assert.ok(alignmentErrors(overlap).includes('protected/excluded overlap'));
});

test('Russian protected distinctions retain dignity, rights, property, care and agency', () => {
  assert.match(protectedText('p052'), /нравственное.*социальном.*экзистенциальное.*достоинство онтологическое/s);
  assert.match(protectedText('p052'), /могут возрастать или уменьшаться.*никакой грех.*ограничения/s);
  assert.match(protectedText('p055'), /зачатия.*естественного завершения.*аборте.*эвтаназии/s);
  assert.match(protectedText('p066'), /Право на частную собственность существует.*всегда подчинено/s);
  assert.match(protectedText('p069'), /не подразумевает самоустранение государства/);
  assert.match(protectedText('p099'), /конкретную пользу.*лишены нравственной совести/s);
  assert.match(protectedText('p118'), /мы обязаны стремиться устранить страдание.*мудро признавать нашу фундаментальную конечность/s);
  assert.match(instruction('p118'), /stronger.*obligation to strive to eliminate/s);
  assert.match(review.faithPremises.find(p => p.paragraphId === 'p118').instructions[0].description, /duty to strive to eliminate suffering/);
  assert.match(protectedText('p143'), /первичное и неотчуждаемое право.*нравственными, культурными и религиозными/s);
  assert.match(protectedText('p154'), /отсутствие занятости не подрывало участия человека в жизни общества/);
  assert.match(protectedText('p165'), /устойчивом союзе мужчины и женщины/);
  assert.match(protectedText('p169'), /трудом, услугами и отдыхом/);
  assert.match(instruction('p169'), /Do not replace services with leisure/);
});

test('Russian institutional scrutiny retains abuse, slavery delay, legitimation and pardon', () => {
  assert.match(protectedText('p089'), /духовного, экономического, институционального, сексуального.*властью и совестью/s);
  assert.match(protectedText('p138'), /журналисты.*жертвам.*не должны ждать/s);
  const t = protectedText('p176');
  assert.match(t, /насколько запоздало Церковь и общество осудили/);
  assert.match(t, /церковные институты владели рабами/);
  assert.match(t, /регулировали и узаконивали/);
  assert.match(t, /в течение восемнадцати веков/);
  assert.match(t, /От имени Церкви я искренне прошу прощения/);
  assert.match(corpus.footnotes[173].text, /экономические интересы.*несовместимость рабства/s);
  assert.match(corpus.footnotes[174].text, /1866.*неосуждаяегополностью/s);
  assert.match(instruction('p176'), /Do not import a missing-delay tension from Belarusian/);
});

test('Russian military safeguards and practical conclusion survive devotional exclusions', () => {
  assert.match(protectedText('p192'), /законную оборону.*самом строгом смысле/s);
  assert.match(protectedText('p197'), /крайней мерой.*законной обороны/s);
  assert.match(protectedText('p198'), /недопустимо поручать.*смерти или иным необратимым.*исключительно важно.*ценности и благоразумное суждение/s);
  assert.match(instruction('p198'), /no local “as far as possible”/);
  assert.match(protectedText('p199'), /цепочка ответственности.*прозрачной и проверяемой.*времени.*комбатантов и некомбатантов/s);
  assert.match(protectedText('p200'), /действенным, сознательным и ответственным человеческим контролем/);
  assert.match(protectedText('p228'), /трудиться ради мира в наших отношениях и в нашем обществе/);
  assert.match(review.exclusions.find(e => e.id === 'p228-exclusion-1').preserve, /unarmed.*persevering/);
  assert.match(protectedText('p231'), /плачу малых.*хрупкости стариков.*молчанию жертв/s);
  assert.match(protectedText('p236'), /не пытаясь скрыться в псевдодуховности/);
  assert.match(protectedText('p239'), /посещение одиноких, служение бедным/);
  assert.match(protectedText('p240'), /условия труда, скрытые за нашими устройствами/);
  assert.match(protectedText('p241'), /ответственность/);
  assert.match(protectedText('p243'), /римляне властвуют/);
  assert.match(protectedText('p244'), /вдовы, сироты, чужеземца, раненого ребенка, изгнанника, беженца/);
  assert.match(protectedText('p245'), /Будем делиться тем, кто мы есть и что имеем/);
});

test('Russian editorial corrections and frozen textual anomalies stay local', () => {
  assert.match(instruction('p047'), /academics and universities/);
  assert.match(instruction('p063'), /do not invent a corruption claim/);
  assert.match(instruction('p082'), /do not import an English PDF\/web discrepancy/);
  assert.match(instruction('p133'), /original-sin.*optional foundations/);
  assert.match(paragraphs.get('p004').text, /новых в ещах/);
  assert.match(paragraphs.get('p078').text, /культуру \[106\]отбросов/);
  assert.match(paragraphs.get('p198').text, /руководствоваться совесть/);
  assert.match(paragraphs.get('p201').text, /единство и миро/);
  assert.match(paragraphs.get('p213').text, /я предлагаю способов/);
  assert.match(paragraphs.get('p215').text, /Почему же ты приемлешь справедливости\?/);
  assert.match(paragraphs.get('p215').text, /Пс 84\(85\), 11b/);
  assert.deepEqual(corpus.footnotes[83].paragraphIds, ['p064']);
  assert.match(corpus.footnotes[132].text, /распространенного русского перевода.*СССР/s);
  assert.match(review.notes[132].referenceReview, /Preserve the caveat/);
  assert.match(corpus.footnotes[142].text, /Москва 1996, 615/);
  assert.match(corpus.footnotes[186].text, /Маториной/);
  assert.match(corpus.footnotes[212].text, /Deuscaritasest/);
  assert.match(corpus.footnotes[213].text, /Церковь и время/);
  assert.match(corpus.footnotes[215].text, /В Нём Едином мы едины/);
  for (const id of ['p004', 'p078', 'p118', 'p169', 'p176', 'p198', 'p215']) assert.ok(review.editionDifferences.some(d => d.paragraphId === id));
  for (const id of ['n026', 'n066', 'n067', 'n133', 'n143', 'n163', 'n175', 'n182', 'n187', 'n201', 'n213', 'n214', 'n216', 'n217']) assert.ok(review.editionDifferences.some(d => d.noteId === id));
});
