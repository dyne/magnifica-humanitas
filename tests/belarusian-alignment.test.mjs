import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relationTypes } from '../scripts/validate-editorial.mjs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const corpus = read('content/source/be/corpus.json');
const review = read('content/editorial/be/alignment-review.json');
const sourceAlignment = read('content/source/be/alignment.json');
const manifest = read('content/source/be/manifest.json');
const concepts = read('content/editorial/concepts.json').concepts;
const paragraphs = new Map(corpus.paragraphs.map(p => [p.id, p]));
const hash = text => createHash('sha256').update(text).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const intersects = (a, b) => a.paragraphId === b.paragraphId && a.start < b.end && b.start < a.end;
const precedingKind = (text, id) => ['n066', 'n067', 'n201'].includes(id) ? 'same-author'
  : /^(?:Пар\. )?тамсама(?:[., ]|$)/iu.test(text) ? 'same-work'
  : /^(?:Пар\. )?той жа(?:[, ]|$)/iu.test(text) ? 'same-author' : undefined;

// Internal source-comparison evidence, not a publication flag or proof of
// semantic fidelity. L9.2 and L9.3 retain independent reading/interface gates.
function alignmentErrors(data) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  check(data.locale === 'be' && data.editionId === corpus.editionId, 'edition');
  check(data.sourceHtmlSha256 === corpus.sourceHtmlSha256, 'snapshot');
  check(data.sourceAuthority.selectedFormat === manifest.selectedFormat && data.sourceAuthority.selectedFormat === 'HTML' && data.sourceAuthority.htmlPath === 'content/source/be/official.html' && data.sourceAuthority.linkedPdfLanguage === manifest.inspection.pdfComparison.actualLanguage && data.sourceAuthority.linkedPdfLanguage === 'en' && data.sourceAuthority.linkedPdfUse === 'comparison-evidence-only', 'Belarusian HTML authority');
  check(equal(data.coverage.map(r => r.paragraphId), corpus.paragraphs.map(p => p.id)), 'coverage order/completeness');
  check(new Set(data.coverage.map(r => r.reviewInstruction)).size === 245, 'individual review instructions');
  for (const record of data.coverage) {
    const p = paragraphs.get(record.paragraphId);
    check(record.sourceSha256 === p?.sha256 && p?.sha256 === hash(p.text), `coverage hash ${record.paragraphId}`);
    check(['retain', 'adapt', 'context'].includes(record.disposition), `whole omission ${record.paragraphId}`);
    check(Boolean(record.reviewInstruction?.trim()), `review instruction ${record.paragraphId}`);
    check(record.localWitness?.paragraphId === record.paragraphId, `local witness identity ${record.paragraphId}`);
    check(record.conceptIds.length > 0 && record.conceptIds.every(id => concepts.some(c => c.id === id)), `coverage concepts ${record.paragraphId}`);
    check(typeof record.optionalFaithPremise === 'boolean', `premise placement ${record.paragraphId}`);
    for (const q of record.necessaryQualifications) {
      check(q.kind === 'editorial-instruction' && q.sourceRefs.includes(record.paragraphId) && q.sourceRefs.every(id => paragraphs.has(id)), `qualification ${record.paragraphId}`);
    }
  }
  check(equal(data.terms.map(t => t.conceptId), concepts.map(c => c.id)), 'concept identities');
  const labels = new Set(data.relationLabels.map(l => l.type));
  check(data.relationLabels.length === relationTypes.size && labels.size === relationTypes.size && [...relationTypes].every(t => labels.has(t)), 'relation labels');
  for (const l of data.relationLabels) check(l.kind === 'editorial-interpretation' && Boolean(l.label.trim()) && l.sourceRefs.includes(l.anchor.paragraphId) && l.sourceRefs.every(id => paragraphs.has(id)), 'relation interpretation');
  const quotes = [
    ...data.coverage.map(r => r.localWitness), ...data.terms.map(t => t.anchor), ...data.relationLabels.map(r => r.anchor),
    ...data.exclusions.flatMap(e => [e.sourceSpan, e.reviewContext]),
    ...data.protectedSpans.map(p => p.sourceSpan),
    ...data.faithPremises.map(p => p.reviewContext),
  ];
  for (const q of quotes) {
    const p = paragraphs.get(q.paragraphId);
    check(q.kind === 'quotation' && Number.isInteger(q.start) && Number.isInteger(q.end) && q.start >= 0 && q.end > q.start && q.end <= (p?.text.length ?? 0), 'span coordinates');
    check(p?.text.slice(q.start, q.end) === q.text, `contiguous Belarusian span ${q.paragraphId}`);
    check(q.sourceSha256 === p?.sha256 && q.sha256 === hash(q.text), `span hashes ${q.paragraphId}`);
  }
  for (const t of data.terms) check(t.sourceRefs.includes(t.anchor.paragraphId) && t.sourceRefs.every(id => paragraphs.has(id)) && Boolean(t.label.trim()), `term refs ${t.conceptId}`);
  check(equal(data.faithPremises.map(p => p.paragraphId), data.coverage.filter(r => r.optionalFaithPremise).map(r => r.paragraphId)), 'faith premise completeness');
  for (const p of data.faithPremises) {
    check(p.placement === 'optional-foundations' && p.paragraphId === p.reviewContext.paragraphId && p.reviewContext.text === paragraphs.get(p.paragraphId)?.text, 'complete premise review context');
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
    check(n.sourceMarker === source?.sourceMarker, `note marker ${n.noteId}`);
    check(equal(n.sourceLinks, source?.sourceLinks), `official links ${n.noteId}`);
    if (n.previousNoteId) check(n.previousNoteId === corpus.footnotes[source.number - 2]?.id, `preceding citation ${n.noteId}`);
    check(Boolean(n.previousNoteId) === Boolean(precedingKind(source.text, n.noteId)) && n.previousReferenceKind === precedingKind(source.text, n.noteId), `preceding citation presence/kind ${n.noteId}`);
    check(n.screen === (['n132', 'n174', 'n175', 'n182'].includes(n.noteId) ? 'argument-and-citation' : 'bibliographic'), `local note screen ${n.noteId}`);
  }
  return errors;
}

const protectedText = id => review.protectedSpans.filter(p => p.sourceSpan.paragraphId === id).map(p => p.sourceSpan.text).join(' ');

test('Belarusian alignment binds every local paragraph, concept, relation label and span', () => {
  assert.deepEqual(alignmentErrors(review), []);
  assert.equal(review.coverage.length, 245);
  assert.equal(review.coverage.filter(r => r.disposition === 'context').length, 42);
  assert.equal(review.terms.length, 27);
  assert.equal(review.relationLabels.length, 9);
  assert.equal(review.faithPremises.length, 84);
  assert.equal(review.protectedSpans.length, 67);
  assert.equal(review.coverage.reduce((n, r) => n + r.necessaryQualifications.length, 0), 116);
  assert.match(review.method, /not public reading copy or native-speaker proofreading/);
  assert.match(review.method, /common English internal instructions are inherited policy/);
  assert.equal(review.terms.find(t => t.conceptId === 'dignity').anchor.text, 'анталагічнай годнасці');
  assert.equal(review.terms.find(t => t.conceptId === 'subsidiarity').label, 'Субсідыярнасць');
  assert.equal(review.terms.find(t => t.conceptId === 'institutional-accountability').anchor.text, 'падсправаздачнасці');
  assert.match(review.terms.find(t => t.conceptId === 'institutional-accountability').review, /accountability.*адказваць/);
  assert.equal(review.terms.find(t => t.conceptId === 'peace').label, 'Спакой і мір');
});

test('Belarusian notes preserve all 224 local bodies, markers, links and dependencies', () => {
  assert.equal(review.notes.length, 224);
  assert.deepEqual(review.notes.filter(n => n.screen === 'argument-and-citation').map(n => n.noteId), ['n132', 'n174', 'n175', 'n182']);
  assert.equal(review.notes.filter(n => n.previousReferenceKind === 'same-work').length, 35);
  assert.equal(review.notes.filter(n => n.previousReferenceKind === 'same-author').length, 23);
  for (const id of ['n066', 'n067', 'n201']) {
    const note = review.notes.find(n => n.noteId === id);
    assert.equal(note.previousReferenceKind, 'same-author');
    assert.match(note.referenceReview, /newly titled work/);
  }
  for (const id of ['n002', 'n007', 'n163', 'n204', 'n207', 'n211']) assert.equal(review.notes.find(n => n.noteId === id).previousReferenceKind, 'same-work');
  assert.equal(review.notes[216].previousNoteId, undefined);
  assert.match(review.editionDifferences.find(d => d.noteId === 'n163').review, /closing Benedict/);
  const bad = structuredClone(review);
  bad.notes[65].previousReferenceKind = 'same-work';
  bad.notes[203].previousNoteId = 'n202';
  delete bad.notes[206].previousNoteId;
  bad.notes[131].screen = 'bibliographic';
  assert.ok(alignmentErrors(bad).includes('preceding citation presence/kind n066'));
  assert.ok(alignmentErrors(bad).includes('preceding citation n204'));
  assert.ok(alignmentErrors(bad).includes('preceding citation presence/kind n207'));
  assert.ok(alignmentErrors(bad).includes('local note screen n132'));
});

test('Belarusian Psalm numbering collision is disclosed without repairing frozen note mapping', () => {
  const note = review.notes.find(n => n.noteId === 'n084');
  assert.deepEqual(note.paragraphIds, ['p064', 'p215']);
  assert.match(note.referenceReview, /alternative Psalm number/);
  assert.match(paragraphs.get('p215').text, /Пс 85 \[84\], 11b/);
  assert.ok(paragraphs.get('p215').noteReferences.some(r => r.noteId === 'n084' && r.text === '[84]'));
  const bad = structuredClone(review);
  bad.notes[83].paragraphIds = ['p064'];
  assert.ok(alignmentErrors(bad).includes('note backlinks n084'));
  const missing = structuredClone(review);
  missing.notes.splice(83, 1);
  assert.ok(alignmentErrors(missing).includes('note mapping completeness'));
});

test('Belarusian evidence rejects foreign coordinates, splicing and stale source bindings', () => {
  const wrongSource = structuredClone(review);
  wrongSource.sourceAuthority.selectedFormat = 'PDF';
  assert.ok(alignmentErrors(wrongSource).includes('Belarusian HTML authority'));
  const foreign = structuredClone(review);
  foreign.terms[0].anchor.start = 609; // Polish coordinate is not Belarusian provenance.
  assert.ok(alignmentErrors(foreign).some(e => e.includes('contiguous Belarusian span')));
  const spliced = structuredClone(review);
  const q = spliced.protectedSpans[0].sourceSpan;
  q.text = q.text.slice(0, 10) + q.text.slice(-10);
  q.sha256 = hash(q.text);
  assert.ok(alignmentErrors(spliced).some(e => e.includes('contiguous Belarusian span')));
  const stale = structuredClone(review);
  stale.sourceHtmlSha256 = '0'.repeat(64);
  stale.coverage[243].sourceSha256 = '0'.repeat(64);
  stale.coverage[0].localWitness.paragraphId = 'p002';
  stale.terms[0].sourceRefs.push('p999');
  assert.ok(alignmentErrors(stale).includes('snapshot'));
  assert.ok(alignmentErrors(stale).includes('coverage hash p244'));
  assert.ok(alignmentErrors(stale).includes('local witness identity p001'));
  assert.ok(alignmentErrors(stale).includes('term refs dignity'));
  const labels = structuredClone(review);
  labels.relationLabels[0].type = 'unsupported';
  labels.relationLabels[1].kind = 'quotation';
  assert.ok(alignmentErrors(labels).includes('relation labels'));
  assert.ok(alignmentErrors(labels).includes('relation interpretation'));
});

test('Belarusian mixed exclusions preserve complete contexts and prohibit whole omission', () => {
  const bad = structuredClone(review);
  bad.coverage.pop();
  bad.coverage[243].disposition = 'omit-devotional';
  bad.faithPremises.splice(bad.faithPremises.findIndex(p => p.paragraphId === 'p074'), 1);
  bad.exclusions[0].matchScope = 'source-location';
  assert.ok(alignmentErrors(bad).includes('coverage order/completeness'));
  assert.ok(alignmentErrors(bad).includes('whole omission p244'));
  assert.ok(alignmentErrors(bad).includes('faith premise completeness'));
  assert.ok(alignmentErrors(bad).includes('reviewed matching scope'));
  assert.deepEqual(review.exclusions.filter(e => e.matchScope === 'source-location').map(e => [e.id, e.sourceSpan.text]), [['p241-exclusion-1', 'малітву і']]);
  assert.equal(review.exclusions.filter(e => e.sourceSpan.paragraphId === 'p228').length, 3);
  assert.ok(!review.exclusions.some(e => ['p008', 'p121', 'p125', 'p148', 'p176'].includes(e.sourceSpan.paragraphId)));
  for (const id of ['p013', 'p074', 'p090']) assert.ok(review.faithPremises.some(p => p.paragraphId === id));
  const overlap = structuredClone(review);
  overlap.exclusions[0].sourceSpan = structuredClone(review.protectedSpans.find(p => p.sourceSpan.paragraphId === 'p176').sourceSpan);
  assert.ok(alignmentErrors(overlap).includes('protected/excluded overlap'));
});

test('Belarusian protected argument retains dignity, rights, care, property and Church scrutiny', () => {
  assert.match(protectedText('p052'), /маральную.*сацыяльную.*экзістэнцыяльную.*анталагічнай/s);
  assert.match(protectedText('p052'), /узрастаць або змяншацца.*Ніякі грэх.*дыскрымінацыя/s);
  assert.match(protectedText('p055'), /зачацця.*натуральнай смерці.*аборту.*эўтаназіі/s);
  assert.match(protectedText('p066'), /права на прыватную ўласнасць.*падпарадкавана/s);
  assert.match(protectedText('p067'), /марнатраўства.*эксплуатацыі/);
  assert.match(protectedText('p069'), /не апраўдвае пасіўнасць дзяржавы/);
  assert.match(protectedText('p099'), /адчувальныя перавагі.*маральнага сумлення/s);
  assert.match(protectedText('p118'), /правільна старацца палегчыць цярпенне/);
  assert.match(protectedText('p143'), /першаснае і неад’емнае права.*маральнымі, культурнымі і рэлігійнымі/s);
  assert.match(protectedText('p154'), /беспрацоўе не абмяжуе ўдзел у грамадскім жыцці/);
  assert.match(protectedText('p165'), /мужчынам і жанчынай/);
  assert.match(protectedText('p089'), /духоўнага, эканамічнага, інстытуцыйнага, сексуальнага.*ўладай.*сумленнем/s);
  assert.match(protectedText('p138'), /журналісты.*злоўжыванняў.*не павінны чакаць/s);
});

test('Belarusian slavery passage preserves its edition tension, explicit delay and institutional pardon', () => {
  const text = protectedText('p176');
  assert.match(text, /не можам адмаўляць ці змяншаць той факт, што і грамадства, і Касцёл асудзілі зло рабства/);
  assert.match(text, /касцёльныя інтытуты мелі нявольнікаў/);
  assert.match(text, /урэгуляваць і легітымізаваць/);
  assert.match(text, /Касцёл доўга цярпеў рабства/);
  assert.match(text, /васямнаццаць стагоддзяў/);
  assert.match(text, /ад імя Касцёла, я шчыра прашу прабачэння/);
  assert.match(review.coverage[175].necessaryQualifications.at(-1).text, /omits delay.*Do not silently repair/s);
  assert.match(review.editionDifferences.find(d => d.paragraphId === 'p176').review, /lacks the delay qualifier/);
  assert.match(corpus.footnotes[174].text, /1866.*не асуджаючы яго цалкам/);
  assert.match(corpus.footnotes[173].text, /эканамічны ціск.*несумяшчальнасці рабства/s);
});

test('Belarusian military prudence and concluding practical subjects survive devotional exclusion', () => {
  assert.match(protectedText('p192'), /законную абарону.*самым сціслым сэнсе/s);
  assert.match(protectedText('p197'), /крайняй меры.*законнай самаабароны/);
  assert.match(protectedText('p198'), /смяротныя.*незваротныя.*наколькі гэта магчыма.*маральную экасістэму.*сумлення.*абмежаванні/s);
  assert.match(protectedText('p199'), /ланцужок адказнасці.*ідэнтыфікаваць і праверыць.*хуткасць і эфектыўнасць.*камбатантаў і некамбатантаў/s);
  assert.match(protectedText('p200'), /эфектыўным, свядомым і адказным кантролем чалавека/);
  assert.match(protectedText('p228'), /самааддана імкнуцца да яго ў нашых адносінах і ў грамадстве/);
  assert.match(protectedText('p231'), /слёзы малых.*кволасць старых.*ахвяраў/s);
  assert.match(protectedText('p236'), /не ўцякаючы ў духоўную сентыментальнасць/);
  assert.match(protectedText('p239'), /самотных.*бедным/s);
  assert.match(protectedText('p240'), /умовы працы, схаваныя за нашымі прыладамі/);
  assert.match(protectedText('p243'), /Рымляне пануюць/);
  assert.match(protectedText('p244'), /ўдавы, сіраты, чужынца, параненага дзіцяці, выгнанніка і бежанца/);
  assert.match(protectedText('p245'), /дзелячыся тым, кім з’яўляемся і што маем/);
});

test('Belarusian frozen spellings and bibliographic differences remain exact evidence', () => {
  assert.match(paragraphs.get('p098').text, /распрапрацоўшчыкі/);
  assert.match(paragraphs.get('p107').text, /«карэкціроўкі» \(alignment\)/);
  assert.match(paragraphs.get('p116').text, /чалавечагабыцця/);
  assert.match(paragraphs.get('p122').text, /як як/);
  assert.match(paragraphs.get('p237').text, /«угрунтаваным антрапацэнтрызмам»/);
  assert.match(corpus.footnotes[142].text, /The Origins of Totalitarianism, III , New York 1962, 474/);
  assert.match(corpus.footnotes[182].text, /^Пар\. \]/);
  assert.match(corpus.footnotes[212].text, /25 снежня 2005/);
  for (const id of ['n066', 'n067', 'n143', 'n163', 'n175', 'n182', 'n183', 'n187', 'n197', 'n201', 'n213', 'n217']) assert.ok(review.editionDifferences.some(d => d.noteId === id));
});
