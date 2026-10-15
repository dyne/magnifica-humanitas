import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadReadingInputs, validateReading, buildReadingIndex, estimateTrailReading } from '../scripts/reading-content.mjs';

const inputs = loadReadingInputs('be');
const { reading, corpus, coverage } = inputs;
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const english = read('content/reading/en.json');
const review = read('content/editorial/be/semantic-review.json');
const alignment = read('content/editorial/be/alignment-review.json');
const hash = value => createHash('sha256').update(value).digest('hex');
const context = id => reading.contexts.find(c => c.paragraphId === id).explanation.text;
const main = id => reading.readingSequence.find(c => c.contextId === id).explanation?.text;
const concept = id => reading.concepts.find(c => c.id === id);

function publicBlocks() {
  const blocks = [];
  const add = (id, value, group) => blocks.push({ id, text: value.text, sourceRefs: value.sourceRefs, group });
  for (const c of reading.contexts) add(c.paragraphId, c.explanation, 'context');
  for (const e of reading.readingSequence) add(e.id, e.explanation ?? { text: e.contextLinkLabel, sourceRefs: e.sourceRefs }, 'sequence');
  for (const c of reading.concepts) {
    for (const key of ['definition', 'necessaryDistinction', 'foundation']) if (c[key]) add(`${c.id}:${key}`, c[key], 'concept');
    for (const b of c.reasoning) add(b.id, b, 'reasoning');
  }
  for (const r of reading.relations) add(r.id, r.explanation, 'relation');
  for (const t of reading.trails) {
    for (const key of ['introduction', 'qualification', 'ending']) add(`${t.id}:${key}`, t[key], 'trail');
    for (const s of t.steps) add(`${t.id}:${s.id}`, s.transition, 'transition');
    for (const key of ['prompt', 'feedback', 'scenario']) if (t.reflection[key]) add(`${t.reflection.id}:${key}`, t.reflection[key], 'reflection');
  }
  return blocks;
}

test('complete Belarusian reading validates against its own official source', () => {
  assert.deepEqual(validateReading(inputs), []);
  assert.equal(reading.locale, 'be');
  assert.equal(reading.editionId, corpus.editionId);
  assert.match(reading.revision, /^be-/);
  assert.equal(reading.concepts.length, 27);
  assert.equal(reading.concepts.reduce((n, c) => n + c.reasoning.length, 0), 86);
  assert.equal(reading.relations.length, 44);
  assert.equal(reading.contexts.length, 245);
  assert.equal(reading.readingSequence.length, 245);
  assert.equal(reading.readingSequence.filter(e => e.placement === 'main').length, 203);
  assert.equal(reading.readingSequence.filter(e => e.placement === 'optional-context').length, 42);
  assert.equal(new Set(reading.contexts.map(c => c.explanation.text)).size, 245);
});

test('every Belarusian block and paragraph comparison has current review evidence', () => {
  const blocks = publicBlocks();
  assert.equal(blocks.length, 762);
  assert.equal(review.blocks.length, blocks.length);
  assert.equal(new Set(review.blocks.map(b => b.id)).size, blocks.length);
  assert.equal(review.revision, reading.revision);
  assert.equal(review.sourceHtmlSha256, corpus.sourceHtmlSha256);
  for (const b of blocks) {
    const evidence = review.blocks.find(e => e.id === b.id);
    assert.ok(evidence, b.id);
    assert.equal(evidence.group, b.group, b.id);
    assert.equal(evidence.authoredSha256, hash(b.text), `renew semantic review: ${b.id}`);
    assert.deepEqual(evidence.sourceRefs, b.sourceRefs, b.id);
    for (const id of b.sourceRefs) assert.equal(evidence.sourceHashes[id], corpus.paragraphs.find(p => p.id === id).sha256, b.id);
  }
  assert.deepEqual(review.sourceComparisons.map(p => p.paragraphId), corpus.paragraphs.map(p => p.id));
  for (const [i, p] of review.sourceComparisons.entries()) {
    assert.equal(p.sourceSha256, corpus.paragraphs[i].sha256);
    assert.equal(p.contextSha256, hash(context(p.paragraphId)));
    assert.ok(p.meaningCheck.length > 30);
  }
  assert.equal(review.groupReviews[0].start, 'p001');
  assert.equal(review.groupReviews.at(-1).end, 'p245');
  for (const [path, expected] of Object.entries(review.artifacts)) assert.equal(hash(readFileSync(new URL(`../${path}`, import.meta.url))), expected, path);
  assert.match(review.method, /No external factual update or native-speaker proofreading is claimed/);
});

test('Belarusian source index exposes exact local quotes and notes without foreign bodies', () => {
  const index = buildReadingIndex(inputs);
  assert.equal(index.paragraphs.length, 245);
  assert.equal(index.notes.length, 224);
  for (const p of index.paragraphs) {
    const source = corpus.paragraphs.find(s => s.id === p.paragraphId);
    assert.equal(p.sourceSha256, source.sha256);
    assert.equal('text' in p, false);
    for (const q of p.quotations) assert.equal(corpus.paragraphs.find(s => s.id === q.paragraphId).text.slice(q.start, q.end), q.text);
  }
  for (const n of index.notes) {
    const source = corpus.footnotes.find(s => s.id === n.id);
    assert.equal(n.text, source.text);
    assert.deepEqual(n.sourceLinks, source.sourceLinks);
  }
  assert.deepEqual(index.notes.find(n => n.id === 'n084').paragraphIds, ['p064', 'p215']);
  assert.match(context('p215'), /альтэрнатыўную нумарацыю.*не бібліяграфічную/s);
  assert.match(context('p215'), /Аўгустын.*нататкай 191/s);
  assert.match(context('p215'), /нататка 84 спасылаецца на іншую прамову/);
});

test('Belarusian note review keeps local same-author exceptions and substantive notes', () => {
  assert.equal(reading.reviewedNotes.length, 224);
  assert.deepEqual(reading.reviewedNotes.filter(n => n.classification === 'source-argument-and-citation').map(n => n.id), ['n132', 'n174', 'n175', 'n182']);
  for (const n of alignment.notes) {
    const local = reading.reviewedNotes.find(r => r.id === n.noteId);
    assert.equal(local.sourceSha256, n.sourceSha256);
    assert.equal(local.previousNoteId, n.previousNoteId);
    assert.equal(local.previousReferenceKind, n.previousReferenceKind);
  }
  assert.equal(reading.reviewedNotes.filter(n => n.previousReferenceKind === 'same-work').length, 35);
  assert.equal(reading.reviewedNotes.filter(n => n.previousReferenceKind === 'same-author').length, 23);
  for (const id of ['n066', 'n067', 'n201']) assert.equal(reading.reviewedNotes.find(n => n.id === id).previousReferenceKind, 'same-author');
  assert.equal(reading.reviewedNotes.find(n => n.id === 'n163').previousNoteId, 'n162');
  assert.equal(reading.reviewedNotes.find(n => n.id === 'n217').previousNoteId, undefined);
  assert.match(main('p120'), /132.*сэрца.*сустрэча.*паэзія.*гісторыя/s);
  assert.match(corpus.footnotes[174].text, /1866.*не асуджаючы яго цалкам/s);
  assert.match(corpus.footnotes[181].text, /прэвентыўныя/);
});

test('Belarusian intrinsic dignity, rights and source positions remain explicit', () => {
  assert.match(main('p052'), /Маральная.*сацыяльная.*экзістэнцыяльная.*анталагічная.*не губляецца/s);
  assert.match(main('p055'), /Касцёла.*зачацця.*натуральнай смерці.*аборту.*эўтаназіі/s);
  assert.match(main('p056'), /запалоханых або зманіпуляваных/);
  assert.match(main('p143'), /першаснае і неад’емнае права.*маральных, культурных і рэлігійных/s);
  assert.match(main('p165'), /пазіцыя|атрыбутаванае/);
  assert.match(main('p165'), /мужчыны і жанчыны/);
  assert.match(concept('dignity').necessaryDistinction.text, /Праца яе выражае, але не стварае/);
});

test('Belarusian care and AI claims retain local strength, diversity and attribution', () => {
  assert.match(main('p098'), /аўтар|Леў XIV/);
  assert.match(main('p098'), /хутка старэюць.*абмежавана/s);
  assert.match(main('p099'), /карысць.*катэгарычна.*навуковы кансенсус/s);
  assert.match(main('p116'), /розныя плыні.*больш радыкальных/s);
  assert.match(main('p118'), /правільна.*палегчыць цярпенне/s);
  assert.match(main('p118'), /не апраўданне адмовы ў лячэнні/);
  assert.doesNotMatch(main('p118'), /абавязак ліквідаваць|абавязаны ліквідаваць/);
  assert.match(main('p126'), /палягчаюць цярпенне.*адносінаў/s);
  assert.match(concept('ai-limits').necessaryDistinction.text, /пазіцыя крыніцы.*не абвешчаны навуковы кансенсус/s);
  assert.match(concept('ai-governance').necessaryDistinction.text, /каштоўнасцяў.*меншасць/s);
});

test('Belarusian property, subsidiarity and economic policy retain the local qualifications', () => {
  assert.match(main('p066'), /прызнае права на прыватную ўласнасць.*падпарадкоўвае/s);
  assert.match(main('p067'), /Патэнты, алгарытмы, платформы, інфраструктура і дадзеныя/);
  assert.match(main('p067'), /будучыя пакаленні.*марнатраўства.*эксплуатацыі/s);
  assert.match(main('p069'), /не апраўдвае бяздзейнасці дзяржавы/);
  assert.match(main('p071'), /аўдыту.*доступу.*абароны/s);
  assert.match(main('p074'), /свядома прымаюць адказнасць/);
  assert.match(main('p081'), /бяспечныя законныя шляхі.*заставацца на радзіме/s);
  assert.match(main('p162'), /пераразмеркаванне.*недастаткова.*рэсурсы, фінансаванне, вытворчасць і спажыванне/s);
  assert.match(main('p164'), /аспрэч/);
  assert.match(main('p164'), /навыкі, інфраструктуру і асноўныя паслугі.*падатковую, сацыяльную і прамысловую/s);
  assert.match(main('p178'), /копію дадзеных недастаткова.*вырашаць/s);
});

test('Belarusian work, family and hidden labor retain support and participation', () => {
  assert.match(main('p149'), /дапамога можа быць неабходная.*не павінна стаць адзіным/s);
  assert.match(main('p152'), /Пажадана.*небяспечных.*прыбытак не апраўдвае/s);
  assert.match(main('p153'), /рознымі наступствамі.*мясцовыя.*[уў]дзел супольнасцяў/s);
  assert.match(main('p154'), /беспрацоўе не абмяжуе ўдзел/);
  assert.match(main('p169'), /вольнага часу і адпачынку.*перападрыхтоўкі.*сетак/s);
  assert.match(main('p173'), /маркіруюць дадзеныя.*навучаюць мадэлі.*мадэруюць кантэнт/s);
  assert.match(main('p173'), /жанчын.*дзецьмі ды падлеткамі.*гандлю людзьмі/s);
  assert.match(main('p179'), /этычнай праверкі.*прымусовай працай/s);
});

test('Belarusian Church criticism, slavery tension and present duties remain visible', () => {
  assert.match(main('p089'), /духоўнага, эканамічнага, інстытуцыйнага, сексуальнага.*сумленнем.*кампенсацыя.*прафілактыка/s);
  assert.match(main('p138'), /журналістаў.*ахвярам.*сам Касцёл абавязаны/s);
  assert.match(main('p176'), /касцёльныя інстытуты мелі нявольнікаў.*легітымізавала.*доўгую цярпімасць.*васямнаццаць стагоддзяў.*прабачэння/s);
  assert.match(context('p176'), /без удакладнення пра затрымку.*доўга цярпеў.*васямнаццаць стагоддзяў.*1866.*Напружанасць/s);
  assert.match(main('p177'), /прадухіленні, абароне, вызваленні і рэабілітацыі/);
  const quote = coverage.records.find(r => r.paragraphId === 'p176').protectedSpans[0].sourceSpan;
  assert.match(quote.text, /той факт, што і грамадства, і Касцёл асудзілі зло рабства/);
  assert.equal(corpus.paragraphs[175].text.slice(quote.start, quote.end), quote.text);
});

test('Belarusian military AI keeps last resort, bounded values work and effective control', () => {
  assert.match(main('p192'), /законную абарону.*строгім сэнсе.*прэвентыўных/s);
  assert.match(main('p197'), /крайнюю меру законнай самаабароны.*гонкі ўзбраенняў/s);
  assert.match(main('p198'), /смяротных.*незваротных.*каштоўнасцяў і здаровага сэнсу наколькі магчыма.*сумленне/s);
  assert.match(main('p199'), /ідэнтыфікаваць і праверыць.*час.*маральнага меркавання.*камбатантаў.*некамбатантамі/s);
  assert.match(main('p200'), /эфектыўным, свядомым і адказным чалавечым кантролем/);
  const t = reading.trails.find(t => t.id === 'peace-and-responsibility');
  assert.match(t.qualification.text, /Намінальны дазвол.*не раўняецца кантролю/s);
  assert.match(t.reflection.feedback.text, /час для маральнага меркавання.*мірных жыхароў/s);
  assert.match(main('p211'), /не ліквідуе канфлікт магічна/);
});

test('Belarusian conclusion retains concrete subjects around every devotional boundary', () => {
  assert.match(main('p228'), /бяззбройны.*раззбройвае.*пакору і трываласць.*адносінамі і грамадствам/s);
  assert.match(main('p231'), /дзяцей.*старых.*ахвяраў.*змаганне/s);
  assert.match(context('p234'), /Сакрамэнтальная прыналежнасць.*супольныя наступствы/s);
  assert.match(main('p235'), /справядлівасць.*бедных.*сакрамэнтальная аснова/s);
  assert.match(main('p236'), /адкідае ўцёкі ў духоўную сентыментальнасць/);
  assert.match(main('p239'), /фізічнай прысутнасці.*самотных.*бедным/s);
  assert.match(main('p240'), /[уў]мовы працы, ланцужкі паставак/);
  assert.match(context('p241'), /Нээмія.*малітву.*арганізуе працу/s);
  assert.match(context('p243'), /рымскае панаванне.*не падмяняе фактаў/s);
  assert.match(main('p244'), /ўдавы, сіраты, чужынца, параненага дзіцяці, выгнанніка і бежанца/);
  assert.match(main('p245'), /дзяліцца тым, хто мы ёсць і што маем/);
});

test('Belarusian premise contexts are integrated, attributed and independently phrased', () => {
  assert.equal(review.contextPremiseReview.combinations.length, 84);
  const mainWithPremise = reading.readingSequence.filter(e => e.placement === 'main' && e.foundationContextId);
  assert.equal(mainWithPremise.length, 57);
  for (const e of mainWithPremise) {
    assert.notEqual(e.explanation.text, context(e.contextId), e.id);
    assert.ok(review.contextPremiseReview.combinations.some(c => c.paragraphId === e.contextId));
  }
  assert.match(context('p013'), /сілу ў слабасці|сілу|сілы|сіле/);
  assert.match(context('p074'), /вера.*даручан/iu);
  assert.match(context('p090'), /Бабілёнская вежа.*Ерузалема/);
  for (const c of reading.concepts) if (c.foundation) {
    assert.notEqual(c.foundation.text, c.definition.text);
    assert.ok(!c.reasoning.some(b => b.text === c.foundation.text));
  }
});

test('Belarusian prose, labels and finite trails contain no inherited English filler', () => {
  const texts = publicBlocks().map(b => b.text);
  for (const text of texts) {
    assert.match(text, /[А-Яа-яЁёІіЎў]/u);
    assert.doesNotMatch(text, /\uFFFD|\b(?:Preserve|Retain|Omit|TODO|Lorem ipsum|Estimated reading time|Optional source context)\b/u);
  }
  for (const t of reading.trails) {
    assert.match(t.title, /[А-Яа-яЁёІіЎў]/u);
    assert.match(t.question, /\?$/u);
    assert.equal(t.reflection.optional, true);
    if (t.reflection.scenario) assert.ok(t.reflection.scenario.text.startsWith(reading.localeMetadata.scenarioPrefix));
    const estimate = estimateTrailReading(t, reading);
    for (const key of ['words', 'wordsPerMinute', 'minutes']) assert.equal(t.readingEstimate[key], estimate[key]);
    assert.equal(t.readingEstimate.label, 'Прыблізны час чытання');
    assert.match(t.readingEstimate.method, /200 слоў за хвіліну/);
    assert.ok(t.ending.text.length > 120);
  }
});

test('Belarusian reading rejects missing notes, broken identities, stale estimates and spliced quotations', () => {
  const bad = structuredClone(inputs);
  bad.reading.reviewedNotes.pop();
  bad.reading.readingSequence.pop();
  bad.reading.concepts[0].sourceQuotation.text += ' дадатак';
  bad.reading.trails[0].readingEstimate.words += 100;
  const errors = validateReading(bad);
  assert.ok(errors.some(e => /n224/.test(e)));
  assert.ok(errors.some(e => /sequence|sequential/i.test(e)));
  assert.ok(errors.some(e => /quotation must be exact/.test(e)));
  assert.ok(errors.some(e => /estimate/i.test(e)));
});

// Source.vue renders this explanation on its own. These checks intentionally
// inspect no main reading, placement explanation, concept quotation or foundation.
const standaloneRequirements = {
  p052: [/маральную.*учынкаў/s, /сацыяльную.*умоў жыцця і павагі/s, /экзістэнцыяльную.*перажывання/s, /могуць узрастаць або змяншацца/, /Анталагічная.*не памяншаецца.*грэх.*дыскрымінацыю/s, /стварае і любіць Бог/],
  p118: [/лічыць правільным старацца палегчыць цярпенне/, /прызнаць.*абмежаванасць/s, /не апраўдвае адмовы ў лячэнні/],
  p176: [/касцёльныя інстытуты.*мелі нявольнікаў/s, /рэгулявання і легітымізацыі/, /без удакладнення пра затрымку/, /Касцёл доўга цярпеў рабства/, /васямнаццаць стагоддзяў/, /ад імя Касцёла просіць прабачэння/, /1866/],
  p244: [/ўдавы, сіраты, чужынца, параненага дзіцяці, выгнанніка і бежанца/, /Марыя.*Адкуплення/s],
  p089: [/духоўнага, эканамічнага, інстытуцыйнага, сексуальнага/, /злоўжывання ўладай і насілля над сумленнем/, /кампенсацыя і прафілактыка/, /супольным карыстанні рэсурсамі/],
  p148: [/Абарона работнікаў.*эксплуатацыі/s, /Праца — не адна вытворчасць/, /малітвы і працы/],
  p228: [/бяззбройны.*раззбройвае.*пакорным і трывалым/s, /самааддана.*[уў] адносінах і грамадстве/s],
  p231: [/слёзы дзяцей, кволасць старых, маўчанне ахвяраў/, /Уцелаўленне/],
  p239: [/фізічнай прысутнасці/, /наведванне самотных і служэнне бедным/],
  p240: [/ланцужкі паставак, схаваныя ўмовы працы/, /маніпуляцыі ды вайны/],
  p245: [/дзелячыся тым, хто мы ёсць і што маем/, /штодзённая вернасць/, /Уцелаўлення/],
};
function standaloneMeaningErrors(index) {
  const errors = [];
  for (const [id, patterns] of Object.entries(standaloneRequirements)) {
    const text = index.paragraphs.find(p => p.paragraphId === id)?.explanation.text ?? '';
    for (const pattern of patterns) if (!pattern.test(text)) errors.push(`${id}: ${pattern}`);
  }
  return errors;
}

test('built Belarusian source explanations independently retain high-stakes meaning', () => {
  const index = buildReadingIndex(inputs);
  assert.deepEqual(standaloneMeaningErrors(index), []);
  for (const id of Object.keys(standaloneRequirements)) {
    const broken = structuredClone(inputs);
    broken.reading.contexts.find(c => c.paragraphId === id).explanation.text = 'Аўтар разглядае чалавечае жыццё ў святле веры.';
    // Complete main prose cannot rescue a deficient independently rendered source.
    assert.equal(broken.reading.readingSequence.find(e => e.contextId === id).explanation.text, main(id));
    assert.ok(standaloneMeaningErrors(buildReadingIndex(broken)).some(error => error.startsWith(`${id}:`)), id);
  }
});

test('standalone context correction retains main reading and source identity', () => {
  assert.equal(hash(JSON.stringify(reading.readingSequence)), 'b8e1e50124b14d1cd50fd43c24f465da5b1927f8a0b7de53eae35b25a6b3bc2c');
  assert.equal(corpus.sourceHtmlSha256, alignment.sourceHtmlSha256);
  assert.equal(hash(readFileSync(new URL('../content/editorial/be/alignment-review.json', import.meta.url))), '6ad751c40357a041f9cb464e12116f0beb2c19c97ea8fd1aad4f4db22abcdfde');
  assert.equal(reading.revision, 'be-2026-10-15-reading-2');
  assert.equal(review.standaloneContextReview.mainPremisePairs.length, 57);
  assert.equal(review.standaloneContextReview.allContexts.length, 245);
  const index = buildReadingIndex(inputs);
  for (const record of review.standaloneContextReview.allContexts) {
    assert.equal(record.explanationSha256, hash(index.paragraphs.find(p => p.paragraphId === record.paragraphId).explanation.text));
    assert.ok(record.check.length > 30);
  }
});
